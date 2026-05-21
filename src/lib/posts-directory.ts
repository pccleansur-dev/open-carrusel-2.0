import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { Carousel } from "@/types/carousel";

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[-\s]+/g, "-")
    .toLowerCase() || "carousel";
}

function resolveConfiguredDir(value: string): string {
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), value);
}

function formatFolderTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "sin-fecha";
  }

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}`;
}

function buildFolderName(params: {
  action: "export" | "scheduled" | "published";
  carouselName: string;
  timestamp: string;
}) {
  const actionLabel =
    params.action === "export"
      ? "Exportada"
      : params.action === "scheduled"
        ? "Programado"
        : "Publicada";

  return `${formatFolderTimestamp(params.timestamp)} - ${actionLabel} - ${params.carouselName
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim() || "Carousel"}`;
}

export async function saveExportToPostsDirectory(params: {
  baseDir: string;
  carousel: Carousel;
  pngBuffers: Array<{ name: string; buffer: Buffer }>;
  zipBuffer: Buffer;
  action?: "export" | "scheduled" | "published";
  timestamp?: string;
}) {
  const action = params.action ?? "export";
  const timestamp = params.timestamp ?? new Date().toISOString();
  const folderName = buildFolderName({
    action,
    carouselName: params.carousel.name,
    timestamp,
  });
  const targetDir = path.join(resolveConfiguredDir(params.baseDir), folderName);

  await mkdir(targetDir, { recursive: true });

  await Promise.all(
    params.pngBuffers.map(({ name, buffer }) =>
      writeFile(path.join(targetDir, name), buffer)
    )
  );

  const zipName = `${slugify(params.carousel.name)}.zip`;
  await writeFile(path.join(targetDir, zipName), params.zipBuffer);

  const hashtags = params.carousel.hashtags?.length
    ? params.carousel.hashtags.map((tag) => `#${tag}`).join(" ")
    : "";
  const captionText = [params.carousel.caption ?? "", hashtags].filter(Boolean).join("\n\n");

  if (captionText) {
    await writeFile(path.join(targetDir, "caption.txt"), captionText, "utf-8");
  }

  await writeFile(
    path.join(targetDir, "post.json"),
    JSON.stringify(
      {
        carouselId: params.carousel.id,
        name: params.carousel.name,
        action,
        aspectRatio: params.carousel.aspectRatio,
        slideCount: params.carousel.slides.length,
        scheduledAt: params.carousel.scheduledAt ?? null,
        postedAt: params.carousel.postedAt ?? null,
        publishedPostId: params.carousel.publishedPostId ?? null,
        publishedPostUrl: params.carousel.publishedPostUrl ?? null,
        savedAt: timestamp,
        files: params.pngBuffers.map(({ name }) => name),
        zipFile: zipName,
      },
      null,
      2
    ),
    "utf-8"
  );

  return targetDir;
}
