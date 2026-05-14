import { mutateData, readDataSafe } from "./data-store";
import { generateId, now } from "../utils";
import type { StylePreset, StylePresetsData } from "@/types/style-preset";

const FILE = "style-presets.json";
const EMPTY_STYLE_PRESETS_DATA: StylePresetsData = { presets: [] };

async function load(): Promise<StylePresetsData> {
  return readDataSafe<StylePresetsData>(FILE, EMPTY_STYLE_PRESETS_DATA);
}

export async function listPresets(): Promise<StylePreset[]> {
  const data = await load();
  return data.presets;
}

export async function getPreset(id: string): Promise<StylePreset | null> {
  const data = await load();
  return data.presets.find((p) => p.id === id) ?? null;
}

export async function createPreset(
  params: Omit<StylePreset, "id" | "createdAt">
): Promise<StylePreset> {
  return mutateData(FILE, EMPTY_STYLE_PRESETS_DATA, (data) => {
    const preset: StylePreset = {
      ...params,
      id: generateId(),
      createdAt: now(),
    };
    data.presets.push(preset);
    return { result: preset };
  });
}

export async function deletePreset(id: string): Promise<boolean> {
  return mutateData(FILE, EMPTY_STYLE_PRESETS_DATA, (data) => {
    const idx = data.presets.findIndex((p) => p.id === id);
    if (idx === -1) return { result: false, changed: false };
    data.presets.splice(idx, 1);
    return { result: true };
  });
}
