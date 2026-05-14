import { NextResponse } from "next/server";
import {
  createCarouselUseCase,
  listCarouselsUseCase,
} from "@/application/carousels";
import { parseCreateCarouselInput } from "@/contracts/carousels";
import { handleRouteError } from "@/app/api/_shared/responses";

export async function GET() {
  const carousels = await listCarouselsUseCase();
  return NextResponse.json({ carousels });
}

export async function POST(request: Request) {
  try {
    const { name, aspectRatio } = parseCreateCarouselInput(await request.json());
    const carousel = await createCarouselUseCase(name, aspectRatio);
    return NextResponse.json(carousel, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
