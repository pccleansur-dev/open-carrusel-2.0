import type { AspectRatio, Carousel, Slide } from "@/types/carousel";
import { ValidationError } from "@/application/errors";
import {
  isRecord,
  parseAspectRatio,
  parseOptionalString,
  parseRequiredString,
  parseStringArray,
} from "./shared";

type CarouselUpdateFields = Partial<
  Pick<Carousel, "name" | "aspectRatio" | "tags" | "chatSessionId" | "caption" | "hashtags">
>;
type SlideUpdateFields = Partial<Pick<Slide, "html" | "notes">>;

function parseAspectRatioStrict(value: unknown): AspectRatio {
  return parseAspectRatio(value);
}

export function parseCreateCarouselInput(body: unknown): {
  name: string;
  aspectRatio: AspectRatio;
} {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  return {
    name: parseRequiredString(body.name, "name"),
    aspectRatio:
      body.aspectRatio === undefined
        ? "4:5"
        : parseAspectRatioStrict(body.aspectRatio),
  };
}

export function parseUpdateCarouselInput(body: unknown): CarouselUpdateFields {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  const updates: CarouselUpdateFields = {};

  if ("name" in body) {
    updates.name = parseRequiredString(body.name, "name");
  }
  if ("aspectRatio" in body) {
    updates.aspectRatio = parseAspectRatioStrict(body.aspectRatio);
  }
  if ("tags" in body) {
    updates.tags = parseStringArray(body.tags, "tags");
  }
  if ("chatSessionId" in body) {
    if (body.chatSessionId !== null && typeof body.chatSessionId !== "string") {
      throw new ValidationError("chatSessionId must be a string or null");
    }
    updates.chatSessionId = body.chatSessionId as string | null;
  }
  if ("caption" in body) {
    if (body.caption !== undefined && typeof body.caption !== "string") {
      throw new ValidationError("caption must be a string");
    }
    updates.caption = body.caption as string | undefined;
  }
  if ("hashtags" in body) {
    updates.hashtags = parseStringArray(body.hashtags, "hashtags");
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError("At least one valid field is required");
  }

  return updates;
}

export function parseAddSlideInput(body: unknown): {
  html: string;
  notes?: string;
} {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  return {
    html: parseRequiredString(body.html, "html"),
    notes: parseOptionalString(body.notes, "notes"),
  };
}

export function parseReorderSlidesInput(body: unknown): {
  slideIds: string[];
} {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");
  const slideIds = parseStringArray(body.slideIds, "slideIds");
  if (slideIds.length === 0) {
    throw new ValidationError("slideIds must contain at least one slide ID");
  }
  return { slideIds };
}

export function parseUpdateSlideInput(body: unknown): SlideUpdateFields {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  const updates: SlideUpdateFields = {};

  if ("html" in body) {
    updates.html = parseRequiredString(body.html, "html");
  }
  if ("notes" in body) {
    if (typeof body.notes !== "string") {
      throw new ValidationError("notes must be a string");
    }
    updates.notes = body.notes;
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError("At least one valid field is required");
  }

  return updates;
}

export function parseCaptionUpdateInput(body: unknown): {
  caption?: string;
  hashtags?: string[];
} {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  const updates: { caption?: string; hashtags?: string[] } = {};

  if ("caption" in body) {
    if (body.caption !== undefined && typeof body.caption !== "string") {
      throw new ValidationError("caption must be a string");
    }
    updates.caption = body.caption as string | undefined;
  }

  if ("hashtags" in body) {
    updates.hashtags = parseStringArray(body.hashtags, "hashtags");
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError("At least one valid field is required");
  }

  return updates;
}
