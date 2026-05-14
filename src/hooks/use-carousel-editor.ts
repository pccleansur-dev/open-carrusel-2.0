"use client";

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  deleteCarouselById,
  deleteCarouselSlide,
  generateCarouselCaption,
  getCarouselById,
  reorderCarouselSlides,
  undoCarouselSlide,
  updateCarouselAspectRatio,
  updateCarouselById,
} from "@/lib/api/carousels";
import { saveCarouselAsTemplate } from "@/lib/api/templates";
import type { AspectRatio, Carousel } from "@/types/carousel";

interface UseCarouselEditorOptions {
  onDeleteSuccess?: () => void;
}

function syncActiveSlide(
  nextCarousel: Carousel,
  previousCarousel: Carousel | null,
  setActiveSlide: Dispatch<SetStateAction<number>>
) {
  if (previousCarousel && nextCarousel.slides.length > previousCarousel.slides.length) {
    setActiveSlide(nextCarousel.slides.length - 1);
    return;
  }

  setActiveSlide((previousIndex) =>
    nextCarousel.slides.length === 0
      ? 0
      : Math.min(previousIndex, nextCarousel.slides.length - 1)
  );
}

export function useCarouselEditor(
  carouselId: string,
  options?: UseCarouselEditorOptions
) {
  const [carousel, setCarousel] = useState<Carousel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const autoCaptionedRef = useRef<string | null>(null);

  const applyCarousel = useCallback((nextCarousel: Carousel) => {
    setNotFound(false);
    setCarousel((previousCarousel) => {
      syncActiveSlide(nextCarousel, previousCarousel, setActiveSlide);
      return nextCarousel;
    });
  }, []);

  const refreshCarousel = useCallback(async () => {
    try {
      const nextCarousel = await getCarouselById(carouselId);
      applyCarousel(nextCarousel);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setNotFound(true);
        setCarousel(null);
        return;
      }
      throw error;
    }
  }, [applyCarousel, carouselId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshCarousel().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshCarousel]);

  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      void refreshCarousel().catch(() => {});
    }, 500);

    return () => clearInterval(interval);
  }, [isGenerating, refreshCarousel]);

  useEffect(() => {
    if (!carousel || isGenerating) return;
    if (carousel.slides.length === 0 || carousel.caption?.trim()) return;
    if (autoCaptionedRef.current === carousel.id) return;

    autoCaptionedRef.current = carousel.id;
    void generateCarouselCaption(carousel.id)
      .then(() => refreshCarousel())
      .catch(() => {
        autoCaptionedRef.current = null;
      });
  }, [carousel, isGenerating, refreshCarousel]);

  const updateAspectRatio = useCallback(
    async (aspectRatio: AspectRatio) => {
      const updated = await updateCarouselAspectRatio(carouselId, aspectRatio);
      applyCarousel(updated);
      return updated;
    },
    [applyCarousel, carouselId]
  );

  const renameCarousel = useCallback(
    async (name: string) => {
      const updated = await updateCarouselById(carouselId, { name });
      applyCarousel(updated);
      return updated;
    },
    [applyCarousel, carouselId]
  );

  const deleteSlide = useCallback(
    async (slideId: string) => {
      await deleteCarouselSlide(carouselId, slideId);
      await refreshCarousel();
    },
    [carouselId, refreshCarousel]
  );

  const undoSlide = useCallback(
    async (slideId: string) => {
      await undoCarouselSlide(carouselId, slideId);
      await refreshCarousel();
    },
    [carouselId, refreshCarousel]
  );

  const reorderSlides = useCallback(
    async (slideIds: string[]) => {
      await reorderCarouselSlides(carouselId, slideIds);
      await refreshCarousel();
    },
    [carouselId, refreshCarousel]
  );

  const saveTemplate = useCallback(
    (id: string) => saveCarouselAsTemplate(id),
    []
  );

  const deleteCarousel = useCallback(async () => {
    await deleteCarouselById(carouselId);
    options?.onDeleteSuccess?.();
  }, [carouselId, options]);

  const handleStreamStart = useCallback(() => {
    setIsGenerating(true);
  }, []);

  const handleStreamEnd = useCallback(async () => {
    setIsGenerating(false);
    const nextCarousel = await getCarouselById(carouselId);
    applyCarousel(nextCarousel);

    if (nextCarousel.slides.length > 0 && !nextCarousel.caption?.trim()) {
      await generateCarouselCaption(carouselId);
      await refreshCarousel();
    }
  }, [applyCarousel, carouselId, refreshCarousel]);

  return {
    activeSlide,
    carousel,
    deleteCarousel,
    deleteSlide,
    handleStreamEnd,
    handleStreamStart,
    isGenerating,
    notFound,
    refreshCarousel,
    renameCarousel,
    reorderSlides,
    saveTemplate,
    setActiveSlide,
    undoSlide,
    updateAspectRatio,
  };
}
