import { NextResponse } from "next/server";
import {
  createStagedActionUseCase,
  listStagedActionsUseCase,
} from "@/application/staged-actions";
import { handleRouteError } from "@/app/api/_shared/responses";
import { parseCreateStagedActionInput } from "@/contracts/staged-actions";

export async function GET() {
  const actions = await listStagedActionsUseCase();
  return NextResponse.json({ actions });
}

export async function POST(request: Request) {
  try {
    const input = parseCreateStagedActionInput(await request.json());
    const action = await createStagedActionUseCase(input);
    return NextResponse.json({ action }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
