import { NextResponse } from "next/server";
import { getTemplate } from "@/lib/templates";
import { createCarousel, addSlide } from "@/lib/carousels";
import type { PlanningContext } from "@/types/carousel";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let body: {
    name?: string;
    caption?: string;
    hashtags?: string[];
    planning?: PlanningContext | null;
    tags?: string[];
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Allow empty body for existing template flows.
  }

  // Create new carousel from template
  const carousel = await createCarousel(
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : `${template.name} (from template)`,
    template.aspectRatio,
    {
      caption: typeof body.caption === "string" ? body.caption : undefined,
      hashtags: Array.isArray(body.hashtags)
        ? body.hashtags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
        : undefined,
      planning: body.planning && typeof body.planning === "object" ? body.planning : null,
      tags: [
        ...template.tags,
        ...(Array.isArray(body.tags)
          ? body.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
          : []),
      ],
    }
  );

  // Copy all slides
  for (const slide of template.slides) {
    await addSlide(carousel.id, slide.html, slide.notes);
  }

  return NextResponse.json(carousel, { status: 201 });
}
