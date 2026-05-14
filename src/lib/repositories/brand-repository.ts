import { mutateData, readDataSafe } from "./data-store";
import { now } from "../utils";
import type { BrandConfig } from "@/types/brand";
import { DEFAULT_BRAND } from "@/types/brand";

const FILE = "brand.json";

export interface BrandUpdateInput
  extends Partial<Omit<BrandConfig, "colors" | "fonts" | "createdAt" | "updatedAt">> {
  colors?: Partial<BrandConfig["colors"]>;
  fonts?: Partial<BrandConfig["fonts"]>;
}

export async function getBrand(): Promise<BrandConfig> {
  return readDataSafe<BrandConfig>(FILE, DEFAULT_BRAND);
}

export async function updateBrand(
  updates: BrandUpdateInput
): Promise<BrandConfig> {
  return mutateData(FILE, DEFAULT_BRAND, (current) => {
    const timestamp = now();
    Object.assign(current, updates, {
      colors: { ...current.colors, ...updates.colors },
      fonts: { ...current.fonts, ...updates.fonts },
      updatedAt: timestamp,
      createdAt: current.createdAt || timestamp,
    });
    return { result: current };
  });
}

export function isBrandConfigured(brand: BrandConfig): boolean {
  return brand.name.trim().length > 0;
}
