import { ValidationError } from "@/application/errors";
import type { StylePreset } from "@/types/style-preset";
import {
  isRecord,
  parseAspectRatio,
  parseOptionalString,
  parseRequiredString,
  parseStringArray,
} from "./shared";

function parsePresetBrand(value: unknown): StylePreset["brand"] {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new ValidationError("brand must be an object");
  return value;
}

export function parseCreateStylePresetInput(
  body: unknown
): Omit<StylePreset, "id" | "createdAt"> {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  return {
    name: parseRequiredString(body.name, "name"),
    description: parseOptionalString(body.description, "description") ?? "",
    brand: parsePresetBrand(body.brand),
    designRules: parseRequiredString(body.designRules, "designRules"),
    exampleSlideHtml:
      parseOptionalString(body.exampleSlideHtml, "exampleSlideHtml") ?? "",
    aspectRatio:
      body.aspectRatio === undefined
        ? "4:5"
        : parseAspectRatio(body.aspectRatio),
    tags: body.tags === undefined ? [] : parseStringArray(body.tags, "tags"),
  };
}
