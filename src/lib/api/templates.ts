import { sendJson } from "./client";
import type { Template } from "@/types/template";

export function saveCarouselAsTemplate(carouselId: string): Promise<Template> {
  return sendJson<Template, { carouselId: string }>(
    "/api/templates",
    "POST",
    { carouselId }
  );
}
