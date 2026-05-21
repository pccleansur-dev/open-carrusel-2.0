import type { Carousel } from "@/types/carousel";

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&middot;|&rarr;/gi, " ")
    .replace(/&[a-zA-Z0-9#]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function buildHashtag(value: string): string | null {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();
  if (!normalized) return null;

  const compact = normalized
    .split(/\s+/)
    .filter((part) => part.length > 1)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");

  return compact.length >= 3 ? compact : null;
}

function collectKeywordPhrases(carousel: Carousel): string[] {
  const candidates = [
    carousel.name,
    ...carousel.slides.flatMap((slide) => [slide.notes, stripHtml(slide.html)]),
  ]
    .map((entry) => entry?.trim())
    .filter((entry): entry is string => Boolean(entry));

  const seen = new Set<string>();
  const phrases: string[] = [];

  for (const candidate of candidates) {
    const cleaned = candidate
      .replace(/\s+/g, " ")
      .replace(/[|â€¢Â·]/g, " ")
      .trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    phrases.push(cleaned);
    if (phrases.length >= 6) break;
  }

  return phrases;
}

export function buildCaptionFromCarousel(carousel: Carousel): {
  caption: string;
  hashtags: string[];
} {
  const theme = titleCase(carousel.name.replace(/^\d+\s+/, "").trim() || "Este carrusel");
  const phrases = collectKeywordPhrases(carousel);
  const highlights = phrases
    .filter((phrase) => phrase.length >= 12)
    .slice(0, 3)
    .map((phrase) => `- ${phrase.replace(/\.$/, "")}`);

  const summary =
    highlights.length > 0
      ? highlights.join("\n")
      : "- Ideas claras y accionables para aplicar hoy";

  const caption = [
    `${theme}.`,
    "",
    "En este carrusel vas a encontrar:",
    summary,
    "",
    "Guardalo para tenerlo a mano y compartilo con alguien a quien le pueda servir.",
  ].join("\n");

  const hashtagCandidates = [
    buildHashtag(theme),
    ...phrases.map(buildHashtag),
    ...carousel.tags.map(buildHashtag),
    "Carrusel",
    "InstagramTips",
  ].filter((value): value is string => Boolean(value));

  return {
    caption,
    hashtags: Array.from(new Set(hashtagCandidates)).slice(0, 8),
  };
}
