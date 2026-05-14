import { NextResponse } from "next/server";
import path from "path";
import { generateId, now } from "@/lib/utils";
import {
  addReferenceImageUseCase,
  deleteReferenceImageUseCase,
  getReferenceImagesUseCase,
} from "@/application/carousels";
import { handleRouteError } from "@/app/api/_shared/responses";
import {
  parseAddReferenceInput,
  parseDeleteReferenceInput,
} from "@/contracts/references";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getReferenceImagesUseCase(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { url, name } = parseAddReferenceInput(await request.json());
    const absPath = path.resolve(process.cwd(), "public", url.replace(/^\//, ""));

    const reference = {
      id: generateId(),
      url,
      absPath,
      name: name || "Reference image",
      addedAt: now(),
    };

    const result = await addReferenceImageUseCase(id, reference);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { imageId } = parseDeleteReferenceInput(request.url);
    const result = await deleteReferenceImageUseCase(id, imageId);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
