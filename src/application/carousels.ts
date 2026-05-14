import {
  addSlide,
  addReferenceImage,
  createCarousel,
  duplicateCarousel,
  deleteCarousel,
  deleteSlide,
  getCarousel,
  listCarousels,
  removeReferenceImage,
  reorderSlides,
  undoSlide,
  updateCarousel,
  updateSlide,
} from "@/lib/repositories/carousels-repository";
import { MAX_SLIDES, type AspectRatio, type Carousel, type Slide } from "@/types/carousel";
import { NotFoundError, ValidationError } from "./errors";

type CarouselUpdates = Partial<
  Pick<
    Carousel,
    | "name"
    | "aspectRatio"
    | "tags"
    | "chatSessionId"
    | "caption"
    | "hashtags"
    | "scheduledAt"
    | "postedAt"
    | "publishedPostId"
    | "publishedPostUrl"
  >
>;

type SlideUpdates = Partial<Pick<Slide, "html" | "notes">>;

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&middot;|&rarr;/gi, " ")
    .replace(/&[a-zA-Z0-9#]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function buildHashtag(value: string): string | null {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();
  if (!normalized) return null;

  const compact = normalized
    .split(/\s+/)
    .filter((part) => part.length > 1)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");

  return compact.length >= 3 ? compact : null;
}

function collectKeywordPhrases(carousel: Carousel): string[] {
  const candidates = [
    carousel.name,
    ...carousel.slides.flatMap((slide) => [slide.notes, stripHtml(slide.html)]),
  ]
    .map((entry) => entry?.trim())
    .filter((entry): entry is string => Boolean(entry));

  const seen = new Set<string>();
  const phrases: string[] = [];

  for (const candidate of candidates) {
    const cleaned = candidate
      .replace(/\s+/g, " ")
      .replace(/[|•·]/g, " ")
      .trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    phrases.push(cleaned);
    if (phrases.length >= 6) break;
  }

  return phrases;
}

function buildCaptionFromCarousel(carousel: Carousel): {
  caption: string;
  hashtags: string[];
} {
  const theme = titleCase(carousel.name.replace(/^\d+\s+/, "").trim() || "Este carrusel");
  const phrases = collectKeywordPhrases(carousel);
  const highlights = phrases
    .filter((phrase) => phrase.length >= 12)
    .slice(0, 3)
    .map((phrase) => `- ${phrase.replace(/\.$/, "")}`);

  const summary =
    highlights.length > 0
      ? highlights.join("\n")
      : "- Ideas claras y accionables para aplicar hoy";

  const caption = [
    `${theme}.`,
    "",
    "En este carrusel vas a encontrar:",
    summary,
    "",
    "Guardalo para tenerlo a mano y compartilo con alguien a quien le pueda servir.",
  ].join("\n");

  const hashtagCandidates = [
    buildHashtag(theme),
    ...phrases.map(buildHashtag),
    ...carousel.tags.map(buildHashtag),
    "Carrusel",
    "InstagramTips",
  ].filter((value): value is string => Boolean(value));

  return {
    caption,
    hashtags: Array.from(new Set(hashtagCandidates)).slice(0, 8),
  };
}

async function getCarouselOrThrow(id: string): Promise<Carousel> {
  const carousel = await getCarousel(id);
  if (!carousel) {
    throw new NotFoundError("Carousel not found");
  }
  return carousel;
}

async function getSlideOrThrow(
  carouselId: string,
  slideId: string
): Promise<{ carousel: Carousel; slide: Slide }> {
  const carousel = await getCarouselOrThrow(carouselId);
  const slide = carousel.slides.find((entry) => entry.id === slideId);
  if (!slide) {
    throw new NotFoundError("Slide not found");
  }
  return { carousel, slide };
}

function ensureUniqueSlideIds(slideIds: string[]) {
  if (new Set(slideIds).size !== slideIds.length) {
    throw new ValidationError("slideIds must not contain duplicates");
  }
}

export async function listCarouselsUseCase() {
  return listCarousels();
}

export async function getCarouselUseCase(id: string) {
  return getCarouselOrThrow(id);
}

export async function createCarouselUseCase(
  name: string,
  aspectRatio: AspectRatio
) {
  return createCarousel(name, aspectRatio);
}

export async function updateCarouselUseCase(
  id: string,
  updates: CarouselUpdates
) {
  await getCarouselOrThrow(id);
  const updated = await updateCarousel(id, updates);
  if (!updated) {
    throw new NotFoundError("Carousel not found");
  }
  return updated;
}

export async function scheduleCarouselUseCase(
  id: string,
  scheduledAt: string | null
) {
  const carousel = await getCarouselOrThrow(id);
  if (scheduledAt !== null) {
    if (carousel.slides.length === 0) throw new ValidationError("No hay slides para programar");
    if (!carousel.caption?.trim()) {
      await updateCarousel(id, buildCaptionFromCarousel(carousel));
    }
    if (new Date(scheduledAt) <= new Date()) throw new ValidationError("La fecha debe ser en el futuro");
  }
  const updated = await updateCarousel(id, { scheduledAt });
  if (!updated) throw new NotFoundError("Carousel not found");
  return updated;
}

export async function deleteCarouselUseCase(id: string) {
  const deleted = await deleteCarousel(id);
  if (!deleted) {
    throw new NotFoundError("Carousel not found");
  }
  return { success: true };
}

export async function duplicateCarouselUseCase(id: string) {
  await getCarouselOrThrow(id);
  const duplicated = await duplicateCarousel(id);
  if (!duplicated) {
    throw new NotFoundError("Carousel not found");
  }
  return duplicated;
}

export async function addSlideUseCase(
  carouselId: string,
  html: string,
  notes?: string
) {
  const carousel = await getCarouselOrThrow(carouselId);
  if (carousel.slides.length >= MAX_SLIDES) {
    throw new ValidationError(`A carousel can have at most ${MAX_SLIDES} slides`);
  }

  const slide = await addSlide(carouselId, html, notes ?? "");
  if (!slide) {
    throw new ValidationError("Could not add slide");
  }
  return slide;
}

export async function reorderSlidesUseCase(
  carouselId: string,
  slideIds: string[]
) {
  const carousel = await getCarouselOrThrow(carouselId);
  ensureUniqueSlideIds(slideIds);

  if (slideIds.length !== carousel.slides.length) {
    throw new ValidationError("slideIds must include every slide exactly once");
  }

  const existingIds = new Set(carousel.slides.map((slide) => slide.id));
  if (slideIds.some((id) => !existingIds.has(id))) {
    throw new ValidationError("slideIds contains unknown slide IDs");
  }

  const success = await reorderSlides(carouselId, slideIds);
  if (!success) {
    throw new ValidationError("Could not reorder slides");
  }

  const updatedCarousel = await getCarouselOrThrow(carouselId);
  return { slides: updatedCarousel.slides };
}

export async function updateSlideUseCase(
  carouselId: string,
  slideId: string,
  updates: SlideUpdates
) {
  await getSlideOrThrow(carouselId, slideId);
  const slide = await updateSlide(carouselId, slideId, updates);
  if (!slide) {
    throw new NotFoundError("Slide not found");
  }
  return slide;
}

export async function deleteSlideUseCase(carouselId: string, slideId: string) {
  await getSlideOrThrow(carouselId, slideId);
  const deleted = await deleteSlide(carouselId, slideId);
  if (!deleted) {
    throw new NotFoundError("Slide not found");
  }
  return { success: true };
}

export async function undoSlideUseCase(carouselId: string, slideId: string) {
  const { slide } = await getSlideOrThrow(carouselId, slideId);
  if (slide.previousVersions.length === 0) {
    throw new ValidationError("Slide has no previous versions");
  }

  const restoredSlide = await undoSlide(carouselId, slideId);
  if (!restoredSlide) {
    throw new ValidationError("Could not restore slide");
  }
  return restoredSlide;
}

export async function getCaptionUseCase(id: string) {
  const carousel = await getCarouselOrThrow(id);
  return {
    caption: carousel.caption || "",
    hashtags: carousel.hashtags || [],
  };
}

export async function updateCaptionUseCase(
  id: string,
  updates: { caption?: string; hashtags?: string[] }
) {
  const updated = await updateCarouselUseCase(id, updates);
  return {
    caption: updated.caption || "",
    hashtags: updated.hashtags || [],
  };
}

export async function generateCaptionUseCase(id: string) {
  const carousel = await getCarouselOrThrow(id);
  if (carousel.slides.length === 0) {
    throw new ValidationError("No hay slides para generar caption");
  }

  const updated = await updateCarouselUseCase(id, buildCaptionFromCarousel(carousel));
  return {
    caption: updated.caption || "",
    hashtags: updated.hashtags || [],
  };
}

export async function getReferenceImagesUseCase(id: string) {
  const carousel = await getCarouselOrThrow(id);
  return { references: carousel.referenceImages || [] };
}

export async function addReferenceImageUseCase(
  id: string,
  reference: Parameters<typeof addReferenceImage>[1]
) {
  await getCarouselOrThrow(id);
  const created = await addReferenceImage(id, reference);
  if (!created) {
    throw new NotFoundError("Carousel not found");
  }
  return created;
}

export async function deleteReferenceImageUseCase(id: string, imageId: string) {
  await getCarouselOrThrow(id);
  const deleted = await removeReferenceImage(id, imageId);
  if (!deleted) {
    throw new NotFoundError("Reference image not found");
  }
  return { success: true };
}
