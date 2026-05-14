import { NextResponse } from "next/server";
import {
  deleteCarouselUseCase,
  getCarouselUseCase,
  updateCarouselUseCase,
} from "@/application/carousels";
import { parseUpdateCarouselInput } from "@/contracts/carousels";
import { handleRouteError } from "@/app/api/_shared/responses";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const carousel = await getCarouselUseCase(id);
    return NextResponse.json(carousel);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = parseUpdateCarouselInput(await request.json());
    const updated = await updateCarouselUseCase(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteCarouselUseCase(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
