import { fetchJson, sendJson } from "./client";
import type { BrandConfig } from "@/types/brand";

export function getBrandConfig(): Promise<BrandConfig> {
  return fetchJson<BrandConfig>("/api/brand");
}

export function updateBrandConfig(
  updates: Partial<BrandConfig>
): Promise<BrandConfig> {
  return sendJson<BrandConfig, Partial<BrandConfig>>(
    "/api/brand",
    "PUT",
    updates
  );
}
