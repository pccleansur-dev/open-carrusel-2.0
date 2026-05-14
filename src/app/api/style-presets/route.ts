import { NextResponse } from "next/server";
import {
  createStylePresetUseCase,
  listStylePresetsUseCase,
} from "@/application/style-presets";
import { handleRouteError } from "@/app/api/_shared/responses";
import { parseCreateStylePresetInput } from "@/contracts/style-presets";

export async function GET() {
  const presets = await listStylePresetsUseCase();
  return NextResponse.json({ presets });
}

export async function POST(request: Request) {
  try {
    const input = parseCreateStylePresetInput(await request.json());
    const preset = await createStylePresetUseCase(input);
    return NextResponse.json(preset, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
