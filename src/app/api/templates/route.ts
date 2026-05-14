import { NextResponse } from "next/server";
import {
  createTemplateUseCase,
  listTemplatesUseCase,
} from "@/application/templates";
import { parseCreateTemplateInput } from "@/contracts/templates";
import { handleRouteError } from "@/app/api/_shared/responses";

export async function GET() {
  const templates = await listTemplatesUseCase();
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  try {
    const input = parseCreateTemplateInput(await request.json());
    const template = await createTemplateUseCase(input);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
