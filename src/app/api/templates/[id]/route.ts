import { NextResponse } from "next/server";
import {
  deleteTemplateUseCase,
  getTemplateUseCase,
} from "@/application/templates";
import { handleRouteError } from "@/app/api/_shared/responses";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await getTemplateUseCase(id);
    return NextResponse.json(template);
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
    const result = await deleteTemplateUseCase(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
