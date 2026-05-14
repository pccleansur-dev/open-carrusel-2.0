import { ValidationError } from "@/application/errors";
import { isRecord, parseOptionalString, parseRequiredString } from "./shared";

export function parseCreateTemplateInput(body: unknown): {
  carouselId: string;
  name?: string;
  description?: string;
} {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  return {
    carouselId: parseRequiredString(body.carouselId, "carouselId"),
    name: parseOptionalString(body.name, "name"),
    description: parseOptionalString(body.description, "description"),
  };
}
