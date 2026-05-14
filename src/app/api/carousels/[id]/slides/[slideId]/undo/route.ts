import { NextResponse } from "next/server";
import { undoSlideUseCase } from "@/application/carousels";
import { handleRouteError } from "@/app/api/_shared/responses";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id, slideId } = await params;
    const slide = await undoSlideUseCase(id, slideId);
    return NextResponse.json(slide);
  } catch (error) {
    return handleRouteError(error);
  }
}
