import { mutateData, readDataSafe } from "./data-store";

export interface IntegrationsConfig {
  makeWebhookUrl: string;
  igUserId: string;
  updatedAt: string;
}

const DEFAULTS: IntegrationsConfig = {
  makeWebhookUrl: "",
  igUserId: "",
  updatedAt: "",
};

export async function getIntegrations(): Promise<IntegrationsConfig> {
  const saved = await readDataSafe<IntegrationsConfig>("integrations.json", DEFAULTS);
  // Env vars as fallback if not set in UI
  return {
    ...DEFAULTS,
    ...saved,
    makeWebhookUrl: saved.makeWebhookUrl || process.env.MAKE_INSTAGRAM_WEBHOOK || "",
    igUserId: saved.igUserId || process.env.IG_USER_ID || "",
  };
}

export async function updateIntegrations(
  patch: Partial<IntegrationsConfig>
): Promise<IntegrationsConfig> {
  return mutateData("integrations.json", DEFAULTS, (current) => {
    Object.assign(current, patch, {
      updatedAt: new Date().toISOString(),
    });
    return { result: current };
  });
}
