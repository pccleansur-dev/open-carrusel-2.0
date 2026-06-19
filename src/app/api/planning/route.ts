import { NextResponse } from "next/server";
import { fetchGoogleSheetsPlanning } from "@/lib/google-sheets-planning";
import { getIntegrations } from "@/lib/repositories/integrations-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const integrations = await getIntegrations();
    if (!integrations.googleSheetsCsvUrl.trim()) {
      return NextResponse.json(
        { error: "Google Sheets no esta configurado todavia." },
        { status: 400 }
      );
    }

    const planning = await fetchGoogleSheetsPlanning(integrations);
    return NextResponse.json(planning);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo leer Google Sheets.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
