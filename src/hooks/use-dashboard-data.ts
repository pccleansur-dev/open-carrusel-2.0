"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrandConfig } from "@/lib/api/brand";
import {
  createCarousel as createCarouselRequest,
  deleteCarouselById,
  duplicateCarouselById,
  listCarousels,
} from "@/lib/api/carousels";
import { ApiError } from "@/lib/api/client";
import type { BrandConfig } from "@/types/brand";
import type { Carousel } from "@/types/carousel";

export function useDashboardData() {
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsBrandSetup, setNeedsBrandSetup] = useState(false);

  const refreshCarousels = useCallback(async () => {
    const carouselData = await listCarousels();
    setCarousels(carouselData.carousels ?? []);
    return carouselData.carousels ?? [];
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const [carouselData, brandData] = await Promise.all([
          listCarousels(),
          getBrandConfig(),
        ]);

        if (cancelled) return;
        setCarousels(carouselData.carousels ?? []);
        setBrand(brandData);
        setNeedsBrandSetup(!brandData.name.trim());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshCarousels().catch(() => {});
      }
    };

    const refreshOnFocus = () => {
      void refreshCarousels().catch(() => {});
    };

    void run();
    document.addEventListener("visibilitychange", refreshOnVisibility);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refreshOnVisibility);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [refreshCarousels]);

  const refreshBrand = useCallback(async () => {
    const nextBrand = await getBrandConfig();
    setBrand(nextBrand);
    setNeedsBrandSetup(!nextBrand.name.trim());
    return nextBrand;
  }, []);

  const createCarousel = useCallback(
    (name: string, aspectRatio: string) =>
      createCarouselRequest(name, aspectRatio),
    []
  );

  const removeCarousel = useCallback(async (id: string) => {
    try {
      await deleteCarouselById(id);
      setCarousels((prev) => prev.filter((carousel) => carousel.id !== id));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setCarousels((prev) => prev.filter((carousel) => carousel.id !== id));
        await refreshCarousels().catch(() => {});
        return;
      }
      throw error;
    }
  }, [refreshCarousels]);

  const duplicateCarousel = useCallback(async (id: string) => {
    const duplicate = await duplicateCarouselById(id);
    setCarousels((prev) => [duplicate, ...prev]);
    return duplicate;
  }, []);

  return {
    brand,
    carousels,
    createCarousel,
    duplicateCarousel,
    loading,
    needsBrandSetup,
    refreshBrand,
    refreshCarousels,
    removeCarousel,
  };
}
