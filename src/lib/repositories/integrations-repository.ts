import { readDataSafe, writeData } from "@/lib/data";

export interface IntegrationsConfig {
  makeWebhookUrl: string;
  igUserId: string;
  postsDirectory: string;
  makeResponsePostIdPath: string;
  makeResponsePostUrlPath: string;
  updatedAt: string;
}

const FILE = "integrations.json";

const DEFAULTS: IntegrationsConfig = {
  makeWebhookUrl: "",
  igUserId: "",
  postsDirectory: "",
  makeResponsePostIdPath: "",
  makeResponsePostUrlPath: "",
  updatedAt: "",
};

export async function getIntegrations(): Promise<IntegrationsConfig> {
  const saved = await readDataSafe<IntegrationsConfig>(FILE, DEFAULTS);
  return {
    ...DEFAULTS,
    ...saved,
    makeWebhookUrl: process.env.MAKE_INSTAGRAM_WEBHOOK || saved.makeWebhookUrl || "",
    igUserId: process.env.IG_USER_ID || saved.igUserId || "",
    postsDirectory: saved.postsDirectory || "",
    makeResponsePostIdPath:
      process.env.MAKE_RESPONSE_POST_ID_PATH || saved.makeResponsePostIdPath || "",
    makeResponsePostUrlPath:
      process.env.MAKE_RESPONSE_POST_URL_PATH || saved.makeResponsePostUrlPath || "",
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
