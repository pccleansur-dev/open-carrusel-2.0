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
      publishProvider: "make" | "postwiz";
      makeWebhookUrl: string;
      igUserId: string;
      postsDirectory: string;
      makeResponsePostIdPath: string;
      makeResponsePostUrlPath: string;
      postwizBaseUrl: string;
      postwizApiKey: string;
      postwizIntegrationId: string;
      postwizInstagramEnabled: boolean;
      postwizFacebookEnabled: boolean;
      postwizFacebookIntegrationId: string;
      postwizFacebookUrl: string;
      postwizProviderType: "instagram" | "instagram-standalone";
      postwizPostType: "post" | "story";
      googleSheetsCsvUrl: string;
    }>;

    const updated = await updateIntegrations({
      publishProvider:
        body.publishProvider === "make" || body.publishProvider === "postwiz"
          ? body.publishProvider
          : undefined,
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
      postwizBaseUrl:
        typeof body.postwizBaseUrl === "string" ? body.postwizBaseUrl : undefined,
      postwizApiKey:
        typeof body.postwizApiKey === "string" ? body.postwizApiKey : undefined,
      postwizIntegrationId:
        typeof body.postwizIntegrationId === "string" ? body.postwizIntegrationId : undefined,
      postwizInstagramEnabled:
        typeof body.postwizInstagramEnabled === "boolean"
          ? body.postwizInstagramEnabled
          : undefined,
      postwizFacebookEnabled:
        typeof body.postwizFacebookEnabled === "boolean"
          ? body.postwizFacebookEnabled
          : undefined,
      postwizFacebookIntegrationId:
        typeof body.postwizFacebookIntegrationId === "string"
          ? body.postwizFacebookIntegrationId
          : undefined,
      postwizFacebookUrl:
        typeof body.postwizFacebookUrl === "string" ? body.postwizFacebookUrl : undefined,
      postwizProviderType:
        body.postwizProviderType === "instagram" ||
        body.postwizProviderType === "instagram-standalone"
          ? body.postwizProviderType
          : undefined,
      postwizPostType:
        body.postwizPostType === "post" || body.postwizPostType === "story"
          ? body.postwizPostType
          : undefined,
      googleSheetsCsvUrl:
        typeof body.googleSheetsCsvUrl === "string" ? body.googleSheetsCsvUrl : undefined,
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
