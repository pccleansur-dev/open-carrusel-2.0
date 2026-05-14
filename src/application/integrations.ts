import {
  getIntegrations,
  updateIntegrations,
} from "@/lib/repositories/integrations-repository";

export async function getIntegrationsUseCase() {
  return getIntegrations();
}

export async function updateIntegrationsUseCase(
  updates: Parameters<typeof updateIntegrations>[0]
) {
  return updateIntegrations(updates);
}
