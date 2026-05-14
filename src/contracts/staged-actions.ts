import { ValidationError } from "@/application/errors";
import type { StagedActionStatus } from "@/types/staged-action";
import { isRecord, parseRequiredString } from "./shared";

export function parseCreateStagedActionInput(body: unknown) {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");
  if (body.type !== "export_png") {
    throw new ValidationError('Only "export_png" action type is allowed');
  }

  const fileName = parseRequiredString(body.fileName, "fileName");
  if (!fileName.endsWith(".png")) {
    throw new ValidationError("Only .png files are allowed");
  }

  if (
    body.autoExecute !== undefined &&
    typeof body.autoExecute !== "boolean"
  ) {
    throw new ValidationError("autoExecute must be a boolean");
  }

  return {
    type: "export_png" as const,
    fileName,
    content: parseRequiredString(body.content, "content"),
    description: parseRequiredString(body.description, "description"),
    carouselId: parseRequiredString(body.carouselId, "carouselId"),
    autoExecute: body.autoExecute as boolean | undefined,
  };
}

export function parsePatchStagedActionInput(body: unknown): {
  status: StagedActionStatus;
} {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");
  if (body.status !== "rejected") {
    throw new ValidationError("Invalid status");
  }
  return { status: "rejected" };
}
