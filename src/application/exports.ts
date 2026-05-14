import { createHash } from "crypto";
import {
  getCarousel,
  listScheduledCarousels,
  updateCarousel,
} from "@/lib/repositories/carousels-repository";
import { exportAllSlides } from "@/lib/export-slides";
import { getIntegrations } from "@/lib/repositories/integrations-repository";
import {
  buildZipBuffer,
  cacheExportImages,
  getExportCacheMetadata,
} from "@/infrastructure/exports";
import { getCachedJpegs, uploadPublishedImage } from "@/infrastructure/publish";
import type { Carousel } from "@/types/carousel";
import {
  BadGatewayError,
  InternalServerError,
  NotFoundError,
  ValidationError,
} from "./errors";
import { generateCaptionUseCase } from "./carousels";

function getCarouselRenderSignature(carousel: Carousel): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        aspectRatio: carousel.aspectRatio,
        slides: carousel.slides.map((slide) => ({
          id: slide.id,
          order: slide.order,
          html: slide.html,
        })),
      })
    )
    .digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function findFirstStringByKeys(
  value: unknown,
  keys: string[]
): string | null {
  if (typeof value === "string") {
    return null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findFirstStringByKeys(entry, keys);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(value)) {
    const found = findFirstStringByKeys(nestedValue, keys);
    if (found) return found;
  }

  return null;
}

async function parsePublishResponse(
  response: Response
): Promise<{ publishedPostId: string | null; publishedPostUrl: string | null }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as unknown;
    return {
      publishedPostId: findFirstStringByKeys(payload, [
        "id",
        "post_id",
        "media_id",
        "creation_id",
        "instagram_post_id",
      ]),
      publishedPostUrl: findFirstStringByKeys(payload, [
        "permalink",
        "post_url",
        "instagram_post_url",
        "url",
      ]),
    };
  }

  const text = (await response.text()).trim();
  const urlMatch = text.match(/https?:\/\/\S+/i);
  return {
    publishedPostId: null,
    publishedPostUrl: urlMatch?.[0] ?? null,
  };
}

async function renderAndCacheCarouselExports(carousel: Carousel) {
  const pngBuffers = await exportAllSlides(carousel.slides, carousel.aspectRatio);
  await cacheExportImages(carousel.id, pngBuffers, {
    exportedAt: new Date().toISOString(),
    renderSignature: getCarouselRenderSignature(carousel),
  });
  return pngBuffers;
}

async function getPublishableJpegs(carousel: Carousel) {
  const currentSignature = getCarouselRenderSignature(carousel);
  const cacheMetadata = await getExportCacheMetadata(carousel.id);

  if (cacheMetadata?.renderSignature === currentSignature) {
    const cachedJpegs = await getCachedJpegs(carousel.id);
    if (cachedJpegs) {
      return cachedJpegs;
    }
  }

  await renderAndCacheCarouselExports(carousel);
  const refreshedJpegs = await getCachedJpegs(carousel.id);
  if (!refreshedJpegs) {
    throw new InternalServerError("Publish failed: exported images were not cached correctly");
  }
  return refreshedJpegs;
}

export async function exportCarouselUseCase(id: string) {
  const carousel = await getCarousel(id);
  if (!carousel) throw new NotFoundError("Carousel not found");
  if (carousel.slides.length === 0) throw new ValidationError("No slides to export");

  try {
    const pngBuffers = await renderAndCacheCarouselExports(carousel);
    const zipBuffer = await buildZipBuffer(pngBuffers);
    return {
      zipBuffer,
      downloadName: `carousel-${carousel.name.replace(/[^a-zA-Z0-9-_]/g, "_")}.zip`,
    };
  } catch (error) {
    console.error("Export error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new InternalServerError(`Export failed: ${message}`);
  }
}

export async function publishCarouselUseCase(id: string) {
  const integrations = await getIntegrations();
  if (!integrations.makeWebhookUrl) {
    throw new ValidationError(
      "Webhook de Make no configurado. Configuralo en Ajustes -> Integraciones."
    );
  }
  if (!integrations.igUserId) {
    throw new ValidationError(
      "Instagram User ID no configurado. Configuralo en Ajustes -> Integraciones."
    );
  }

  let carousel = await getCarousel(id);
  if (!carousel) throw new NotFoundError("Carousel not found");
  if (carousel.slides.length === 0) throw new ValidationError("No slides to publish");
  if (!carousel.caption?.trim()) {
    await generateCaptionUseCase(id);
    carousel = await getCarousel(id);
    if (!carousel) throw new NotFoundError("Carousel not found");
  }

  try {
    const jpegBuffers = await getPublishableJpegs(carousel);
    const imageUrls: string[] = [];
    for (const { name, buffer } of jpegBuffers) {
      imageUrls.push(await uploadPublishedImage(buffer, name));
    }

    const hashtags = carousel.hashtags?.map((item) => `#${item}`).join(" ") ?? "";
    const caption = [carousel.caption, hashtags].filter(Boolean).join("\n\n");
    const files = imageUrls.map((url) => ({ media_type: "IMAGE", image_url: url }));

    const response = await fetch(integrations.makeWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ig_user_id: integrations.igUserId,
        caption,
        files,
        carousel_name: carousel.name,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadGatewayError(`Make webhook error: ${errorText}`);
    }

    const publishResult = await parsePublishResponse(response);
    const postedAt = new Date().toISOString();
    await updateCarousel(carousel.id, {
      postedAt,
      publishedPostId: publishResult.publishedPostId,
      publishedPostUrl: publishResult.publishedPostUrl,
    });

    return {
      success: true,
      slides: imageUrls.length,
      publishedPostId: publishResult.publishedPostId,
      publishedPostUrl: publishResult.publishedPostUrl,
    };
  } catch (error) {
    if (error instanceof BadGatewayError) throw error;
    const message = error instanceof Error ? error.message : "Publish failed";
    throw new InternalServerError(message);
  }
}

export async function runScheduledPublishUseCase(): Promise<{ published: number; failed: number }> {
  const due = await listScheduledCarousels();
  let published = 0;
  let failed = 0;

  for (const carousel of due) {
    // Clear scheduledAt immediately to avoid double-firing
    await updateCarousel(carousel.id, { scheduledAt: null });
    try {
      await publishCarouselUseCase(carousel.id);
      published++;
    } catch (error) {
      console.error(`Scheduled publish failed for carousel ${carousel.id}:`, error);
      failed++;
    }
  }

  return { published, failed };
}
