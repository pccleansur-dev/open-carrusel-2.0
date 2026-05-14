import { NextResponse } from "next/server";
import { getBrandUseCase, updateBrandUseCase } from "@/application/brand";
import { handleRouteError } from "@/app/api/_shared/responses";
import { parseBrandUpdateInput } from "@/contracts/brand";

export async function GET() {
  const brand = await getBrandUseCase();
  return NextResponse.json(brand);
}

export async function PUT(request: Request) {
  try {
    const updates = parseBrandUpdateInput(await request.json());
    const updated = await updateBrandUseCase(updates);
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
