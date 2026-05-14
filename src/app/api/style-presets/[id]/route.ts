import { NextResponse } from "next/server";
import {
  deleteStylePresetUseCase,
  getStylePresetUseCase,
} from "@/application/style-presets";
import { handleRouteError } from "@/app/api/_shared/responses";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const preset = await getStylePresetUseCase(id);
    return NextResponse.json(preset);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteStylePresetUseCase(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
