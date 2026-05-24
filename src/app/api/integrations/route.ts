import { NextResponse } from "next/server";
import {
  getEffectivePostsDirectory,
  getIntegrations,
  updateIntegrations,
} from "@/lib/repositories/integrations-repository";

export async function GET() {
  const integrations = await getIntegrations();
  return NextResponse.json({
    ...integrations,
    effectivePostsDirectory: getEffectivePostsDirectory(integrations),
    dockerPostsDirectoryHost: process.env.POSTS_DIRECTORY_HOST || "",
  });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<{
      makeWebhookUrl: string;
      igUserId: string;
      postsDirectory: string;
      makeResponsePostIdPath: string;
      makeResponsePostUrlPath: string;
    }>;

    const updated = await updateIntegrations({
      makeWebhookUrl:
        typeof body.makeWebhookUrl === "string" ? body.makeWebhookUrl : undefined,
      igUserId: typeof body.igUserId === "string" ? body.igUserId : undefined,
      postsDirectory:
        typeof body.postsDirectory === "string" ? body.postsDirectory : undefined,
      makeResponsePostIdPath:
        typeof body.makeResponsePostIdPath === "string"
          ? body.makeResponsePostIdPath
          : undefined,
      makeResponsePostUrlPath:
        typeof body.makeResponsePostUrlPath === "string"
          ? body.makeResponsePostUrlPath
          : undefined,
    });

    return NextResponse.json({
      ...updated,
      effectivePostsDirectory: getEffectivePostsDirectory(updated),
      dockerPostsDirectoryHost: process.env.POSTS_DIRECTORY_HOST || "",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
