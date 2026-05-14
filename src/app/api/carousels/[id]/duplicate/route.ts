import { NextResponse } from "next/server";
import { duplicateCarouselUseCase } from "@/application/carousels";
import { handleRouteError } from "@/app/api/_shared/responses";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const duplicate = await duplicateCarouselUseCase(id);
    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
