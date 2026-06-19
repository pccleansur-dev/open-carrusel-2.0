import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { addReferenceImage, getCarousel } from "@/lib/carousels";
import { generateOpenAIImage } from "@/lib/openai-images";
import { generateId, now } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const UPLOAD_DIR = path.resolve(process.cwd(), "public/uploads");

function buildImagePrompt(prompt: string, carouselName: string) {
  return [
    prompt.trim(),
    "",
    `Context: visual reference or background asset for an Instagram carousel named "${carouselName}".`,
    "Create a polished, high-quality image suitable for social media design.",
    "Avoid readable text, logos, UI chrome, watermarks, or poster-like typography unless explicitly requested.",
  ].join("\n");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const carousel = await getCarousel(id);
    if (!carousel) {
      return NextResponse.json({ error: "Carousel not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      prompt?: string;
      quality?: "low" | "medium" | "high" | "auto";
    };
    const prompt = body.prompt?.trim();
    if (!prompt || prompt.length < 8 || prompt.length > 2000) {
      return NextResponse.json(
        { error: "El prompt debe tener entre 8 y 2000 caracteres." },
        { status: 400 }
      );
    }

    const imageBuffer = await generateOpenAIImage({
      prompt: buildImagePrompt(prompt, carousel.name),
      aspectRatio: carousel.aspectRatio,
      quality: body.quality,
    });

    await mkdir(UPLOAD_DIR, { recursive: true });
    const imageId = generateId();
    const filename = `${imageId}.png`;
    const processed = await sharp(imageBuffer).toColorspace("srgb").png().toBuffer();
    const absPath = path.join(UPLOAD_DIR, filename);
    await writeFile(absPath, processed);

    const ref = {
      id: generateId(),
      url: `/uploads/${filename}`,
      absPath,
      name: `AI: ${prompt.slice(0, 80)}`,
      addedAt: now(),
    };

    const result = await addReferenceImage(id, ref);
    if (!result) {
      return NextResponse.json({ error: "Carousel not found" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar la imagen.";
    console.error("Reference image generation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
