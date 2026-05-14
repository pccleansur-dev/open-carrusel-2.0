import { NextResponse } from "next/server";
import { publishCarouselUseCase } from "@/application/exports";
import { handleRouteError } from "@/app/api/_shared/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await publishCarouselUseCase(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
