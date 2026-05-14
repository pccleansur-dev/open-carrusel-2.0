import { NextResponse } from "next/server";
import {
  deleteSlideUseCase,
  updateSlideUseCase,
} from "@/application/carousels";
import { parseUpdateSlideInput } from "@/contracts/carousels";
import { handleRouteError } from "@/app/api/_shared/responses";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id, slideId } = await params;
    const updates = parseUpdateSlideInput(await request.json());
    const slide = await updateSlideUseCase(id, slideId, updates);
    return NextResponse.json(slide);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id, slideId } = await params;
    const result = await deleteSlideUseCase(id, slideId);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
