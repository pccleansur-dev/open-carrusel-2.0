import { readDataSafe, writeData } from "@/lib/data";

export interface IntegrationsConfig {
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
  googleSheetsSourceUrl: string;
  updatedAt: string;
}

const FILE = "integrations.json";

const DEFAULTS: IntegrationsConfig = {
  publishProvider: "make",
  makeWebhookUrl: "",
  igUserId: "",
  postsDirectory: "",
  makeResponsePostIdPath: "",
  makeResponsePostUrlPath: "",
  postwizBaseUrl: "https://postwiz.wizzi.com.ar/api/public/v1",
  postwizApiKey: "",
  postwizIntegrationId: "",
  postwizInstagramEnabled: true,
  postwizFacebookEnabled: false,
  postwizFacebookIntegrationId: "",
  postwizFacebookUrl: "",
  postwizProviderType: "instagram",
  postwizPostType: "post",
  googleSheetsCsvUrl: "",
  googleSheetsSourceUrl: "",
  updatedAt: "",
};

export async function getIntegrations(): Promise<IntegrationsConfig> {
  const saved = await readDataSafe<IntegrationsConfig>(FILE, DEFAULTS);
  return {
    ...DEFAULTS,
    ...saved,
    publishProvider:
      process.env.PUBLISH_PROVIDER === "postwiz" || process.env.PUBLISH_PROVIDER === "make"
        ? process.env.PUBLISH_PROVIDER
        : saved.publishProvider || DEFAULTS.publishProvider,
    makeWebhookUrl: process.env.MAKE_INSTAGRAM_WEBHOOK || saved.makeWebhookUrl || "",
    igUserId: process.env.IG_USER_ID || saved.igUserId || "",
    postsDirectory: saved.postsDirectory || "",
    makeResponsePostIdPath:
      process.env.MAKE_RESPONSE_POST_ID_PATH || saved.makeResponsePostIdPath || "",
    makeResponsePostUrlPath:
      process.env.MAKE_RESPONSE_POST_URL_PATH || saved.makeResponsePostUrlPath || "",
    postwizBaseUrl:
      process.env.POSTWIZ_BASE_URL || saved.postwizBaseUrl || DEFAULTS.postwizBaseUrl,
    postwizApiKey: process.env.POSTWIZ_API_KEY || saved.postwizApiKey || "",
    postwizIntegrationId:
      process.env.POSTWIZ_INTEGRATION_ID || saved.postwizIntegrationId || "",
    postwizInstagramEnabled:
      process.env.POSTWIZ_INSTAGRAM_ENABLED === "false"
        ? false
        : process.env.POSTWIZ_INSTAGRAM_ENABLED === "true"
          ? true
          : saved.postwizInstagramEnabled ?? DEFAULTS.postwizInstagramEnabled,
    postwizFacebookEnabled:
      process.env.POSTWIZ_FACEBOOK_ENABLED === "true"
        ? true
        : process.env.POSTWIZ_FACEBOOK_ENABLED === "false"
          ? false
          : saved.postwizFacebookEnabled ?? DEFAULTS.postwizFacebookEnabled,
    postwizFacebookIntegrationId:
      process.env.POSTWIZ_FACEBOOK_INTEGRATION_ID ||
      saved.postwizFacebookIntegrationId ||
      "",
    postwizFacebookUrl: process.env.POSTWIZ_FACEBOOK_URL || saved.postwizFacebookUrl || "",
    postwizProviderType:
      process.env.POSTWIZ_PROVIDER_TYPE === "instagram-standalone" ||
      process.env.POSTWIZ_PROVIDER_TYPE === "instagram"
        ? process.env.POSTWIZ_PROVIDER_TYPE
        : saved.postwizProviderType || DEFAULTS.postwizProviderType,
    postwizPostType:
      process.env.POSTWIZ_POST_TYPE === "story" || process.env.POSTWIZ_POST_TYPE === "post"
        ? process.env.POSTWIZ_POST_TYPE
        : saved.postwizPostType || DEFAULTS.postwizPostType,
    googleSheetsCsvUrl: saved.googleSheetsCsvUrl || "",
    googleSheetsSourceUrl: saved.googleSheetsSourceUrl || "",
  };
}

export function getEffectivePostsDirectory(config: Pick<IntegrationsConfig, "postsDirectory">) {
  return process.env.POSTS_DIRECTORY?.trim() || config.postsDirectory.trim() || "";
}

export async function updateIntegrations(
  patch: Partial<IntegrationsConfig>
): Promise<IntegrationsConfig> {
  const current = await getIntegrations();
  const updated: IntegrationsConfig = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeData(FILE, updated);
  return updated;
}
