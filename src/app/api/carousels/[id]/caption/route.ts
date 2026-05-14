import { NextResponse } from "next/server";
import {
  generateCaptionUseCase,
  getCaptionUseCase,
  updateCaptionUseCase,
} from "@/application/carousels";
import { parseCaptionUpdateInput } from "@/contracts/carousels";
import { handleRouteError } from "@/app/api/_shared/responses";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getCaptionUseCase(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = parseCaptionUpdateInput(await request.json());
    const result = await updateCaptionUseCase(id, updates);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await generateCaptionUseCase(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
