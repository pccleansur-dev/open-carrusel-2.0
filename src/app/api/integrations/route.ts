import { NextResponse } from "next/server";
import {
  getIntegrationsUseCase,
  updateIntegrationsUseCase,
} from "@/application/integrations";
import { handleRouteError } from "@/app/api/_shared/responses";
import { parseIntegrationsUpdateInput } from "@/contracts/integrations";

export async function GET() {
  const integrations = await getIntegrationsUseCase();
  return NextResponse.json(integrations);
}

export async function PUT(request: Request) {
  try {
    const updates = parseIntegrationsUpdateInput(await request.json());
    const updated = await updateIntegrationsUseCase(updates);
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
