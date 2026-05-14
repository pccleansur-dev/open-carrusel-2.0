import { NextResponse } from "next/server";
import {
  getStagedActionUseCase,
  rejectStagedActionUseCase,
} from "@/application/staged-actions";
import { handleRouteError } from "@/app/api/_shared/responses";
import { parsePatchStagedActionInput } from "@/contracts/staged-actions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const action = await getStagedActionUseCase(id);
    return NextResponse.json(action);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    parsePatchStagedActionInput(await request.json());
    const updated = await rejectStagedActionUseCase(id);
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
