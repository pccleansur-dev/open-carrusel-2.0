import { NextResponse } from "next/server";
import { buildCaptionFromCarousel } from "@/lib/carousel-caption";
import { getCarousel, updateCarousel } from "@/lib/carousels";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const carousel = await getCarousel(id);
  if (!carousel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    caption: carousel.caption || "",
    hashtags: carousel.hashtags || [],
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { caption, hashtags } = body as {
      caption?: string;
      hashtags?: string[];
    };

    const updated = await updateCarousel(id, { caption, hashtags });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      caption: updated.caption || "",
      hashtags: updated.hashtags || [],
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const carousel = await getCarousel(id);

  if (!carousel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (carousel.slides.length === 0) {
    return NextResponse.json({ error: "No hay slides para generar caption" }, { status: 400 });
  }

  const updated = await updateCarousel(id, buildCaptionFromCarousel(carousel));
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    caption: updated.caption || "",
    hashtags: updated.hashtags || [],
  });
}
