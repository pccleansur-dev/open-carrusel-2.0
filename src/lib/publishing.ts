import { buildCaptionFromCarousel } from "@/lib/carousel-caption";
import { getCarousel, listScheduledCarousels, updateCarousel } from "@/lib/carousels";
import { exportAllSlides } from "@/lib/export-slides";
import { saveExportToPostsDirectory } from "@/lib/posts-directory";
import {
  getEffectivePostsDirectory,
  getIntegrations,
} from "@/lib/repositories/integrations-repository";
import {
  convertPngExportsToJpegs,
  parsePublishResponse,
  uploadPublishedImage,
} from "@/lib/publish";
import { createPostwizPost, uploadPostwizImage } from "@/lib/postwiz";
import { Mutex } from "async-mutex";
import archiver from "archiver";

export class PublishValidationError extends Error {}

const postwizJobMutexes = new Map<string, Mutex>();

function getPostwizJobMutex(id: string) {
  let mutex = postwizJobMutexes.get(id);
  if (!mutex) {
    mutex = new Mutex();
    postwizJobMutexes.set(id, mutex);
  }
  return mutex;
}

async function runExclusivePostwizJob<T>(id: string, task: () => Promise<T>) {
  const mutex = getPostwizJobMutex(id);
  if (mutex.isLocked()) {
    throw new PublishValidationError(
      "Ya hay una publicacion/programacion en curso para este carrusel. Espera a que termine y volve a intentar."
    );
  }

  return mutex.runExclusive(task);
}

function buildCaption(carousel: NonNullable<Awaited<ReturnType<typeof getCarousel>>>) {
  const hashtags = carousel.hashtags?.map((item) => `#${item}`).join(" ") ?? "";
  return [carousel.caption, hashtags].filter(Boolean).join("\n\n");
}

async function ensureCarouselCaption(id: string) {
  let carousel = await getCarousel(id);
  if (!carousel) {
    throw new Error("Carousel not found");
  }

  if (!carousel.caption?.trim()) {
    await updateCarousel(id, buildCaptionFromCarousel(carousel));
    carousel = await getCarousel(id);
    if (!carousel) {
      throw new Error("Carousel not found");
    }
  }

  return carousel;
}

async function createPostwizPostFromCarousel(params: {
  id: string;
  scheduledAt?: string | null;
}) {
  return runExclusivePostwizJob(params.id, async () => {
  const integrations = await getIntegrations();

  if (!integrations.postwizApiKey) {
    throw new PublishValidationError("API key de PostWiz no configurada. Configurala en Integraciones.");
  }

  if (!integrations.postwizInstagramEnabled && !integrations.postwizFacebookEnabled) {
    throw new PublishValidationError("Elegí al menos un canal de PostWiz para publicar.");
  }

  if (integrations.postwizInstagramEnabled && !integrations.postwizIntegrationId) {
    throw new PublishValidationError(
      "Integration ID de Instagram en PostWiz no configurado. Copialo desde /api/public/v1/integrations."
    );
  }

  if (integrations.postwizFacebookEnabled && !integrations.postwizFacebookIntegrationId) {
    throw new PublishValidationError(
      "Integration ID de Facebook en PostWiz no configurado. Copialo desde /api/public/v1/integrations."
    );
  }

  const carousel = await ensureCarouselCaption(params.id);
  if (carousel.slides.length === 0) {
    throw new PublishValidationError("No hay slides para publicar");
  }

  console.log(`[postwiz] Exporting ${carousel.slides.length} slides...`);
  const pngBuffers = await exportAllSlides(carousel.slides, carousel.aspectRatio);
  console.log(`[postwiz] Converting ${pngBuffers.length} PNGs to JPEG...`);
  const jpegBuffers = await convertPngExportsToJpegs(pngBuffers);

  const media = [];
  for (const { name, buffer } of jpegBuffers) {
    console.log(`[postwiz] Uploading ${name} (${Math.round(buffer.length / 1024)}KB)...`);
    media.push(
      await uploadPostwizImage({
        config: integrations,
        name,
        buffer,
      })
    );
  }

  const result = await createPostwizPost({
    config: integrations,
    caption: buildCaption(carousel),
    images: media,
    scheduledAt: params.scheduledAt,
    tags: carousel.tags,
  });

  return {
    carousel,
    pngBuffers,
    postId: result.postId,
    postUrl: result.postUrl,
  };
  });
}

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
  const effectivePostsDirectory = getEffectivePostsDirectory(integrations);

  if (integrations.publishProvider === "postwiz") {
    const result = await createPostwizPostFromCarousel({ id });
    const postedAt = new Date().toISOString();
    await updateCarousel(id, {
      scheduledAt: null,
      scheduledProvider: null,
      scheduledExternalPostId: null,
      postedAt,
      publishedPostId: result.postId,
      publishedPostUrl: result.postUrl,
    });

    const publishedCarousel = await getCarousel(id);
    let savedTo: string | null = null;
    if (publishedCarousel && effectivePostsDirectory) {
      try {
        savedTo = await saveCarouselAssetsToPostsDirectory({
          baseDir: effectivePostsDirectory,
          carousel: publishedCarousel,
          pngBuffers: result.pngBuffers,
          action: "published",
          timestamp: postedAt,
        });
      } catch (saveError) {
        console.error("Posts directory PostWiz publish save error:", saveError);
      }
    }

    return {
      success: true,
      slides: result.pngBuffers.length,
      publishedPostId: result.postId,
      publishedPostUrl: result.postUrl,
      postsDirectorySavedTo: savedTo,
    };
  }

  if (!integrations.makeWebhookUrl) {
    throw new PublishValidationError("Webhook de Make no configurado. Configuralo en Integraciones.");
  }

  if (!integrations.igUserId) {
    throw new PublishValidationError("Instagram User ID no configurado. Configuralo en Integraciones.");
  }

  const carousel = await ensureCarouselCaption(id);

  if (carousel.slides.length === 0) {
    throw new PublishValidationError("No slides to publish");
  }

  console.log(`[publish] Exporting ${carousel.slides.length} slides...`);
  const pngBuffers = await exportAllSlides(carousel.slides, carousel.aspectRatio);
  console.log(`[publish] Converting ${pngBuffers.length} PNGs to JPEG...`);
  const jpegBuffers = await convertPngExportsToJpegs(pngBuffers);
  const imageUrls: string[] = [];

  for (const { name, buffer } of jpegBuffers) {
    console.log(`[publish] Uploading ${name} (${Math.round(buffer.length / 1024)}KB)...`);
    imageUrls.push(await uploadPublishedImage(buffer, name));
    console.log(`[publish] Uploaded ${name} OK`);
  }

  const caption = buildCaption(carousel);
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

  const publishResult = await parsePublishResponse(response, {
    postIdPath: integrations.makeResponsePostIdPath,
    postUrlPath: integrations.makeResponsePostUrlPath,
  });
  const postedAt = new Date().toISOString();
  await updateCarousel(id, {
    scheduledAt: null,
    scheduledProvider: null,
    scheduledExternalPostId: null,
    postedAt,
    publishedPostId: publishResult.publishedPostId,
    publishedPostUrl: publishResult.publishedPostUrl,
  });

  const publishedCarousel = await getCarousel(id);
  let savedTo: string | null = null;
  if (publishedCarousel && effectivePostsDirectory) {
    try {
      savedTo = await saveCarouselAssetsToPostsDirectory({
        baseDir: effectivePostsDirectory,
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
  const effectivePostsDirectory = getEffectivePostsDirectory(integrations);
  if (!effectivePostsDirectory) {
    return null;
  }

  const carousel = await getCarousel(params.id);
  if (!carousel) {
    throw new Error("Carousel not found");
  }

  const pngBuffers = await exportAllSlides(carousel.slides, carousel.aspectRatio);
  return saveCarouselAssetsToPostsDirectory({
    baseDir: effectivePostsDirectory,
    carousel,
    pngBuffers,
    action: "scheduled",
    timestamp: params.scheduledAt,
  });
}

export async function scheduleCarouselById(params: {
  id: string;
  scheduledAt: string | null;
}) {
  const integrations = await getIntegrations();

  if (!params.scheduledAt) {
    return updateCarousel(params.id, {
      scheduledAt: null,
      scheduledProvider: null,
      scheduledExternalPostId: null,
    });
  }

  if (integrations.publishProvider !== "postwiz") {
    return updateCarousel(params.id, {
      scheduledAt: params.scheduledAt,
      scheduledProvider: "local",
      scheduledExternalPostId: null,
    });
  }

  const result = await createPostwizPostFromCarousel({
    id: params.id,
    scheduledAt: params.scheduledAt,
  });

  return updateCarousel(params.id, {
    scheduledAt: params.scheduledAt,
    scheduledProvider: "postwiz",
    scheduledExternalPostId: result.postId,
  });
}
