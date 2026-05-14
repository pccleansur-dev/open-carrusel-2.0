import { NextResponse } from "next/server";
import {
  addSlideUseCase,
  reorderSlidesUseCase,
} from "@/application/carousels";
import {
  parseAddSlideInput,
  parseReorderSlidesInput,
} from "@/contracts/carousels";
import { handleRouteError } from "@/app/api/_shared/responses";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { html, notes } = parseAddSlideInput(await request.json());
    const slide = await addSlideUseCase(id, html, notes);
    return NextResponse.json(slide, { status: 201 });
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
    const { slideIds } = parseReorderSlidesInput(await request.json());
    const result = await reorderSlidesUseCase(id, slideIds);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
