import { mutateData, readDataSafe } from "./data-store";
import { generateId, now } from "../utils";
import type { Template, TemplatesData } from "@/types/template";
import type { Carousel } from "@/types/carousel";

const FILE = "templates.json";
const EMPTY_TEMPLATES_DATA: TemplatesData = { templates: [] };

async function load(): Promise<TemplatesData> {
  return readDataSafe<TemplatesData>(FILE, EMPTY_TEMPLATES_DATA);
}

export async function listTemplates(): Promise<Template[]> {
  const data = await load();
  return data.templates;
}

export async function getTemplate(id: string): Promise<Template | null> {
  const data = await load();
  return data.templates.find((t) => t.id === id) ?? null;
}

export async function saveAsTemplate(
  carousel: Carousel,
  name?: string,
  description?: string
): Promise<Template> {
  return mutateData(FILE, EMPTY_TEMPLATES_DATA, (data) => {
    const template: Template = {
      id: generateId(),
      name: name || carousel.name,
      description: description || `Template from ${carousel.name}`,
      aspectRatio: carousel.aspectRatio,
      slides: carousel.slides.map(({ id, html, order, notes }) => ({
        id,
        html,
        order,
        notes,
      })),
      tags: carousel.tags,
      createdAt: now(),
    };
    data.templates.push(template);
    return { result: template };
  });
}

export async function deleteTemplate(id: string): Promise<boolean> {
  return mutateData(FILE, EMPTY_TEMPLATES_DATA, (data) => {
    const idx = data.templates.findIndex((t) => t.id === id);
    if (idx === -1) return { result: false, changed: false };
    data.templates.splice(idx, 1);
    return { result: true };
  });
}
