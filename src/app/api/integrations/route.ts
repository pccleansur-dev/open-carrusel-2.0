import { NextResponse } from "next/server";
import {
  getIntegrations,
  updateIntegrations,
} from "@/lib/repositories/integrations-repository";

export async function GET() {
  const integrations = await getIntegrations();
  return NextResponse.json(integrations);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<{
      makeWebhookUrl: string;
      igUserId: string;
      postsDirectory: string;
    }>;

    const updated = await updateIntegrations({
      makeWebhookUrl:
        typeof body.makeWebhookUrl === "string" ? body.makeWebhookUrl : undefined,
      igUserId: typeof body.igUserId === "string" ? body.igUserId : undefined,
      postsDirectory:
        typeof body.postsDirectory === "string" ? body.postsDirectory : undefined,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
