import { fetchJson, sendJson } from "./client";
import type { AspectRatio, Carousel, Slide } from "@/types/carousel";

export function listCarousels(): Promise<{ carousels: Carousel[] }> {
  return fetchJson<{ carousels: Carousel[] }>("/api/carousels");
}

export function getCarouselById(id: string): Promise<Carousel> {
  return fetchJson<Carousel>(`/api/carousels/${id}`);
}

export function createCarousel(
  name: string,
  aspectRatio: string
): Promise<Carousel> {
  return sendJson<Carousel, { name: string; aspectRatio: string }>(
    "/api/carousels",
    "POST",
    { name, aspectRatio }
  );
}

export function updateCarouselById(
  id: string,
  updates: Partial<Pick<Carousel, "name" | "aspectRatio" | "caption" | "hashtags" | "tags">>
): Promise<Carousel> {
  return sendJson<
    Carousel,
    Partial<Pick<Carousel, "name" | "aspectRatio" | "caption" | "hashtags" | "tags">>
  >(`/api/carousels/${id}`, "PUT", updates);
}

export function deleteCarouselById(id: string): Promise<{ success: boolean }> {
  return sendJson<{ success: boolean }>(`/api/carousels/${id}`, "DELETE");
}

export function duplicateCarouselById(id: string): Promise<Carousel> {
  return sendJson<Carousel>(`/api/carousels/${id}/duplicate`, "POST");
}

export function reorderCarouselSlides(
  id: string,
  slideIds: string[]
): Promise<{ slides: Slide[] }> {
  return sendJson<{ slides: Slide[] }, { slideIds: string[] }>(
    `/api/carousels/${id}/slides`,
    "PUT",
    { slideIds }
  );
}

export function deleteCarouselSlide(
  carouselId: string,
  slideId: string
): Promise<{ success: boolean }> {
  return sendJson<{ success: boolean }>(
    `/api/carousels/${carouselId}/slides/${slideId}`,
    "DELETE"
  );
}

export function undoCarouselSlide(
  carouselId: string,
  slideId: string
): Promise<Slide> {
  return sendJson<Slide>(
    `/api/carousels/${carouselId}/slides/${slideId}/undo`,
    "POST"
  );
}

export function updateCarouselAspectRatio(
  id: string,
  aspectRatio: AspectRatio
): Promise<Carousel> {
  return updateCarouselById(id, { aspectRatio });
}

export function generateCarouselCaption(
  id: string
): Promise<{ caption: string; hashtags: string[] }> {
  return sendJson<{ caption: string; hashtags: string[] }>(
    `/api/carousels/${id}/caption`,
    "POST"
  );
}
