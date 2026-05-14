import { NextResponse } from "next/server";
import { getChatProviderStatus } from "@/application/chat";

export async function GET() {
  const providerInfo = await getChatProviderStatus();
  return NextResponse.json(providerInfo);
}
