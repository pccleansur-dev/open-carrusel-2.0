import { NextResponse } from "next/server";
import { PublishValidationError, publishCarouselById } from "@/lib/publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await publishCarouselById(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: message },
      { status: error instanceof PublishValidationError ? 400 : 500 }
    );
  }
}
