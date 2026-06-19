import { NextResponse } from "next/server";
import { listCarousels, createCarousel } from "@/lib/carousels";
import type { AspectRatio, PlanningContext } from "@/types/carousel";

export async function GET() {
  const carousels = await listCarousels();
  return NextResponse.json({ carousels });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, aspectRatio, caption, hashtags, tags, planning } = body as {
      name?: string;
      aspectRatio?: AspectRatio;
      caption?: string;
      hashtags?: string[];
      tags?: string[];
      planning?: PlanningContext | null;
    };

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const validRatios: AspectRatio[] = ["1:1", "4:5", "9:16"];
    const ratio = validRatios.includes(aspectRatio as AspectRatio)
      ? (aspectRatio as AspectRatio)
      : "4:5";

    const carousel = await createCarousel(name.trim(), ratio, {
      caption: typeof caption === "string" ? caption : undefined,
      hashtags: Array.isArray(hashtags)
        ? hashtags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
        : undefined,
      tags: Array.isArray(tags)
        ? tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
        : undefined,
      planning: planning && typeof planning === "object" ? planning : null,
    });
    return NextResponse.json(carousel, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
