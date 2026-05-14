import { addSlide, createCarousel, getCarousel } from "@/lib/repositories/carousels-repository";
import {
  deleteTemplate,
  getTemplate,
  listTemplates,
  saveAsTemplate,
} from "@/lib/repositories/templates-repository";
import { NotFoundError } from "./errors";

async function getTemplateOrThrow(id: string) {
  const template = await getTemplate(id);
  if (!template) {
    throw new NotFoundError("Template not found");
  }
  return template;
}

export async function listTemplatesUseCase() {
  return listTemplates();
}

export async function getTemplateUseCase(id: string) {
  return getTemplateOrThrow(id);
}

export async function createTemplateUseCase(input: {
  carouselId: string;
  name?: string;
  description?: string;
}) {
  const carousel = await getCarousel(input.carouselId);
  if (!carousel) {
    throw new NotFoundError("Carousel not found");
  }

  return saveAsTemplate(carousel, input.name, input.description);
}

export async function deleteTemplateUseCase(id: string) {
  const deleted = await deleteTemplate(id);
  if (!deleted) {
    throw new NotFoundError("Template not found");
  }
  return { success: true };
}

export async function applyTemplateUseCase(id: string) {
  const template = await getTemplateOrThrow(id);
  const carousel = await createCarousel(
    `${template.name} (from template)`,
    template.aspectRatio
  );

  for (const slide of template.slides) {
    await addSlide(carousel.id, slide.html, slide.notes);
  }

  return carousel;
}
