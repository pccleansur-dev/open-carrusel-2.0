import { ValidationError } from "@/application/errors";
import type { BrandUpdateInput } from "@/lib/repositories/brand-repository";
import type { BrandConfig } from "@/types/brand";
import { isRecord, parseOptionalString, parseStringArray } from "./shared";

function parseBrandColors(value: unknown): Partial<BrandConfig["colors"]> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new ValidationError("colors must be an object");

  const colors: Partial<BrandConfig["colors"]> = {};
  for (const key of ["primary", "secondary", "accent", "background", "surface"] as const) {
    if (key in value) {
      if (typeof value[key] !== "string") {
        throw new ValidationError(`colors.${key} must be a string`);
      }
      colors[key] = value[key];
    }
  }
  return colors;
}

function parseBrandFonts(value: unknown): Partial<BrandConfig["fonts"]> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new ValidationError("fonts must be an object");

  const fonts: Partial<BrandConfig["fonts"]> = {};
  for (const key of ["heading", "body"] as const) {
    if (key in value) {
      if (typeof value[key] !== "string") {
        throw new ValidationError(`fonts.${key} must be a string`);
      }
      fonts[key] = value[key];
    }
  }
  return fonts;
}

function parseCustomFonts(value: unknown): BrandConfig["customFonts"] | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.some(
      (entry) =>
        !isRecord(entry) ||
        typeof entry.name !== "string" ||
        typeof entry.path !== "string"
    )
  ) {
    throw new ValidationError("customFonts must be an array of { name, path }");
  }

  return value.map((entry) => ({
    name: entry.name as string,
    path: entry.path as string,
  }));
}

export function parseBrandUpdateInput(
  body: unknown
): BrandUpdateInput {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  const updates: BrandUpdateInput = {};

  if ("name" in body) updates.name = parseOptionalString(body.name, "name") ?? "";
  if ("colors" in body) updates.colors = parseBrandColors(body.colors);
  if ("fonts" in body) updates.fonts = parseBrandFonts(body.fonts);
  if ("customFonts" in body) updates.customFonts = parseCustomFonts(body.customFonts);
  if ("logoPath" in body) {
    if (body.logoPath !== null && typeof body.logoPath !== "string") {
      throw new ValidationError("logoPath must be a string or null");
    }
    updates.logoPath = body.logoPath as string | null;
  }
  if ("styleKeywords" in body) {
    updates.styleKeywords = parseStringArray(body.styleKeywords, "styleKeywords");
  }

  return updates;
}
