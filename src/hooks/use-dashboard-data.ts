"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrandConfig } from "@/lib/api/brand";
import {
  createCarousel as createCarouselRequest,
  deleteCarouselById,
  duplicateCarouselById,
  listCarousels,
} from "@/lib/api/carousels";
import type { BrandConfig } from "@/types/brand";
import type { Carousel } from "@/types/carousel";

export function useDashboardData() {
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsBrandSetup, setNeedsBrandSetup] = useState(false);

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

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

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
    await deleteCarouselById(id);
    setCarousels((prev) => prev.filter((carousel) => carousel.id !== id));
  }, []);

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
    removeCarousel,
  };
}
