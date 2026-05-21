import { NextResponse } from "next/server";
import { buildCaptionFromCarousel } from "@/lib/carousel-caption";
import { getCarousel, updateCarousel } from "@/lib/carousels";
import { saveScheduledCarouselSnapshot } from "@/lib/publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = (await request.json()) as { scheduledAt?: string | null };
    const scheduledAt = body.scheduledAt ?? null;
    const carousel = await getCarousel(id);

    if (!carousel) {
      return NextResponse.json({ error: "Carousel not found" }, { status: 404 });
    }

    if (scheduledAt !== null) {
      if (carousel.slides.length === 0) {
        return NextResponse.json({ error: "No hay slides para programar" }, { status: 400 });
      }

      if (!carousel.caption?.trim()) {
        const captionData = buildCaptionFromCarousel(carousel);
        await updateCarousel(id, captionData);
      }

      const targetTime = new Date(scheduledAt);
      if (Number.isNaN(targetTime.getTime())) {
        return NextResponse.json({ error: "Fecha invalida" }, { status: 400 });
      }

      if (targetTime <= new Date()) {
        return NextResponse.json({ error: "La fecha debe ser en el futuro" }, { status: 400 });
      }
    }

    const updated = await updateCarousel(id, { scheduledAt });
    if (!updated) {
      return NextResponse.json({ error: "Carousel not found" }, { status: 404 });
    }

    if (scheduledAt) {
      void saveScheduledCarouselSnapshot({
          id,
          scheduledAt,
        }).catch((saveError) => {
          console.error("Posts directory schedule save error:", saveError);
        });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
