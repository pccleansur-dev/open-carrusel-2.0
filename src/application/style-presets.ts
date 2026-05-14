import {
  deletePreset,
  getPreset,
  listPresets,
  createPreset,
} from "@/lib/repositories/style-presets-repository";
import { NotFoundError } from "./errors";

async function getPresetOrThrow(id: string) {
  const preset = await getPreset(id);
  if (!preset) {
    throw new NotFoundError("Style preset not found");
  }
  return preset;
}

export async function listStylePresetsUseCase() {
  return listPresets();
}

export async function getStylePresetUseCase(id: string) {
  return getPresetOrThrow(id);
}

export async function createStylePresetUseCase(
  input: Parameters<typeof createPreset>[0]
) {
  return createPreset(input);
}

export async function deleteStylePresetUseCase(id: string) {
  const deleted = await deletePreset(id);
  if (!deleted) {
    throw new NotFoundError("Style preset not found");
  }
  return { success: true };
}
