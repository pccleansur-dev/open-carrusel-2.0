import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import archiver from "archiver";
import sharp from "sharp";

const EXPORTS_ROOT = path.resolve(process.cwd(), "data", "exports");
const EXPORT_METADATA_FILE = "metadata.json";

export interface ExportCacheMetadata {
  exportedAt: string;
  renderSignature: string;
}

export async function cacheExportImages(
  carouselId: string,
  pngBuffers: { name: string; buffer: Buffer }[],
  metadata: ExportCacheMetadata
) {
  const cacheDir = path.join(EXPORTS_ROOT, carouselId);
  await mkdir(cacheDir, { recursive: true });

  for (const { name, buffer } of pngBuffers) {
    await writeFile(path.join(cacheDir, name), buffer);
    const jpegBuffer = await sharp(buffer).jpeg({ quality: 92 }).toBuffer();
    await writeFile(path.join(cacheDir, name.replace(".png", ".jpg")), jpegBuffer);
  }

  await writeFile(
    path.join(cacheDir, EXPORT_METADATA_FILE),
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );
}

export async function getExportCacheMetadata(
  carouselId: string
): Promise<ExportCacheMetadata | null> {
  try {
    const raw = await readFile(
      path.join(EXPORTS_ROOT, carouselId, EXPORT_METADATA_FILE),
      "utf-8"
    );
    const parsed = JSON.parse(raw) as Partial<ExportCacheMetadata>;
    if (
      typeof parsed.exportedAt !== "string" ||
      typeof parsed.renderSignature !== "string"
    ) {
      return null;
    }
    return {
      exportedAt: parsed.exportedAt,
      renderSignature: parsed.renderSignature,
    };
  } catch {
    return null;
  }
}

export async function buildZipBuffer(
  files: { name: string; buffer: Buffer }[]
) {
  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 5 } });
    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    for (const file of files) archive.append(file.buffer, { name: file.name });
    archive.finalize();
  });
}
