import { NextResponse } from "next/server";
import { scheduleCarouselUseCase } from "@/application/carousels";
import { handleRouteError } from "@/app/api/_shared/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { scheduledAt: string | null };
    const result = await scheduleCarouselUseCase(id, body.scheduledAt ?? null);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
