import { NextResponse } from "next/server";
import { runScheduledPublishUseCase } from "@/application/exports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await runScheduledPublishUseCase();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron publish error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
