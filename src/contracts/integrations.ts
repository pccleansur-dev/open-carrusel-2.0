import { ValidationError } from "@/application/errors";
import type { IntegrationsConfig } from "@/lib/repositories/integrations-repository";
import { isRecord, parseOptionalString } from "./shared";

export function parseIntegrationsUpdateInput(
  body: unknown
): Partial<IntegrationsConfig> {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  const updates: Partial<IntegrationsConfig> = {};

  if ("makeWebhookUrl" in body) {
    updates.makeWebhookUrl =
      parseOptionalString(body.makeWebhookUrl, "makeWebhookUrl") ?? "";
  }
  if ("igUserId" in body) {
    updates.igUserId = parseOptionalString(body.igUserId, "igUserId") ?? "";
  }

  return updates;
}
