import { buildCaptionFromCarousel } from "@/lib/carousel-caption";
import { getCarousel, listScheduledCarousels, updateCarousel } from "@/lib/carousels";
import { exportAllSlides } from "@/lib/export-slides";
import { saveExportToPostsDirectory } from "@/lib/posts-directory";
import { getIntegrations } from "@/lib/repositories/integrations-repository";
import {
  convertPngExportsToJpegs,
  parsePublishResponse,
  uploadPublishedImage,
} from "@/lib/publish";
import archiver from "archiver";

export class PublishValidationError extends Error {}

async function buildZipBuffer(files: Array<{ name: string; buffer: Buffer }>) {
  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 5 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    archive.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    archive.on("error", (error) => {
      reject(error);
    });

    try {
      for (const file of files) {
        archive.append(file.buffer, { name: file.name });
      }
      archive.finalize();
    } catch (error) {
      archive.destroy();
      reject(error);
    }
  });
}

async function saveCarouselAssetsToPostsDirectory(params: {
  baseDir: string;
  carousel: Awaited<ReturnType<typeof getCarousel>>;
  pngBuffers: Array<{ name: string; buffer: Buffer }>;
  action: "scheduled" | "published";
  timestamp: string;
}) {
  if (!params.carousel) {
    return null;
  }

  const zipBuffer = await buildZipBuffer(params.pngBuffers);
  return saveExportToPostsDirectory({
    baseDir: params.baseDir,
    carousel: params.carousel,
    pngBuffers: params.pngBuffers,
    zipBuffer,
    action: params.action,
    timestamp: params.timestamp,
  });
}

export async function publishCarouselById(id: string) {
  const integrations = await getIntegrations();

  if (!integrations.makeWebhookUrl) {
    throw new PublishValidationError("Webhook de Make no configurado. Configuralo en Integraciones.");
  }

  if (!integrations.igUserId) {
    throw new PublishValidationError("Instagram User ID no configurado. Configuralo en Integraciones.");
  }

  let carousel = await getCarousel(id);
  if (!carousel) {
    throw new Error("Carousel not found");
  }

  if (carousel.slides.length === 0) {
    throw new PublishValidationError("No slides to publish");
  }

  if (!carousel.caption?.trim()) {
    await updateCarousel(id, buildCaptionFromCarousel(carousel));
    carousel = await getCarousel(id);
    if (!carousel) {
      throw new Error("Carousel not found");
    }
  }

  const pngBuffers = await exportAllSlides(carousel.slides, carousel.aspectRatio);
  const jpegBuffers = await convertPngExportsToJpegs(pngBuffers);
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
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Make webhook error");
  }

  const publishResult = await parsePublishResponse(response);
  const postedAt = new Date().toISOString();
  await updateCarousel(id, {
    scheduledAt: null,
    postedAt,
    publishedPostId: publishResult.publishedPostId,
    publishedPostUrl: publishResult.publishedPostUrl,
  });

  const publishedCarousel = await getCarousel(id);
  let savedTo: string | null = null;
  if (publishedCarousel && integrations.postsDirectory.trim()) {
    try {
      savedTo = await saveCarouselAssetsToPostsDirectory({
        baseDir: integrations.postsDirectory,
        carousel: publishedCarousel,
        pngBuffers,
        action: "published",
        timestamp: postedAt,
      });
    } catch (saveError) {
      console.error("Posts directory publish save error:", saveError);
    }
  }

  return {
    success: true,
    slides: imageUrls.length,
    publishedPostId: publishResult.publishedPostId,
    publishedPostUrl: publishResult.publishedPostUrl,
    postsDirectorySavedTo: savedTo,
  };
}

export async function runScheduledPublish() {
  const dueCarousels = await listScheduledCarousels();
  let published = 0;
  let failed = 0;

  for (const carousel of dueCarousels) {
    await updateCarousel(carousel.id, { scheduledAt: null });

    try {
      await publishCarouselById(carousel.id);
      published++;
    } catch (error) {
      console.error(`Scheduled publish failed for carousel ${carousel.id}:`, error);
      failed++;
    }
  }

  return { published, failed };
}

export async function saveScheduledCarouselSnapshot(params: {
  id: string;
  scheduledAt: string;
}) {
  const integrations = await getIntegrations();
  if (!integrations.postsDirectory.trim()) {
    return null;
  }

  const carousel = await getCarousel(params.id);
  if (!carousel) {
    throw new Error("Carousel not found");
  }

  const pngBuffers = await exportAllSlides(carousel.slides, carousel.aspectRatio);
  return saveCarouselAssetsToPostsDirectory({
    baseDir: integrations.postsDirectory,
    carousel,
    pngBuffers,
    action: "scheduled",
    timestamp: params.scheduledAt,
  });
}
