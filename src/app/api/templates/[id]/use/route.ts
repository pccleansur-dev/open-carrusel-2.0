import { NextResponse } from "next/server";
import { applyTemplateUseCase } from "@/application/templates";
import { handleRouteError } from "@/app/api/_shared/responses";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const carousel = await applyTemplateUseCase(id);
    return NextResponse.json(carousel, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
