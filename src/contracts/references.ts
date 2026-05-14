import { ValidationError } from "@/application/errors";
import { isRecord, parseOptionalString, parseRequiredString } from "./shared";

export function parseAddReferenceInput(body: unknown) {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");
  return {
    url: parseRequiredString(body.url, "url"),
    name: parseOptionalString(body.name, "name"),
  };
}

export function parseDeleteReferenceInput(requestUrl: string) {
  const { searchParams } = new URL(requestUrl);
  const imageId = searchParams.get("imageId");
  if (!imageId) {
    throw new ValidationError("imageId is required");
  }
  return { imageId };
}
