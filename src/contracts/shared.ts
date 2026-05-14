import type { AspectRatio } from "@/types/carousel";
import { ValidationError } from "@/application/errors";

const ASPECT_RATIOS = new Set<AspectRatio>(["1:1", "4:5", "9:16"]);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseRequiredString(
  value: unknown,
  fieldName: string
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value.trim();
}

export function parseOptionalString(
  value: unknown,
  fieldName: string
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  return value;
}

export function parseStringArray(
  value: unknown,
  fieldName: string
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ValidationError(`${fieldName} must be an array of strings`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

export function parseAspectRatio(
  value: unknown,
  fieldName = "aspectRatio"
): AspectRatio {
  if (!ASPECT_RATIOS.has(value as AspectRatio)) {
    throw new ValidationError(`${fieldName} must be one of 1:1, 4:5, or 9:16`);
  }
  return value as AspectRatio;
}
