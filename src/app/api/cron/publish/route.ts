import { NextResponse } from "next/server";
import { runScheduledPublish } from "@/lib/publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await runScheduledPublish();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron publish error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
