import { getBrand, updateBrand } from "@/lib/repositories/brand-repository";

export async function getBrandUseCase() {
  return getBrand();
}

export async function updateBrandUseCase(
  updates: Parameters<typeof updateBrand>[0]
) {
  return updateBrand(updates);
}
