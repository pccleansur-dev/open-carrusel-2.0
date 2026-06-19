import { NextResponse } from "next/server";
import { getClaudeRuntimeStatus } from "@/lib/claude-path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceFresh = searchParams.get("force") === "1";
  return NextResponse.json(getClaudeRuntimeStatus(forceFresh));
}
