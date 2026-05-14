import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { InternalServerError, ValidationError } from "@/application/errors";
import { generateId } from "@/lib/utils";

const UPLOAD_DIR = path.resolve(process.cwd(), "public/uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MAGIC_BYTES: Record<string, number[][]> = {
  png: [[0x89, 0x50, 0x4e, 0x47]],
  jpg: [[0xff, 0xd8, 0xff]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
};

const FONT_MAGIC: Record<string, number[][]> = {
  woff2: [[0x77, 0x4f, 0x46, 0x32]],
  ttf: [[0x00, 0x01, 0x00, 0x00]],
};

function matchesMagic(buffer: Uint8Array, magic: number[]): boolean {
  return magic.every((byte, index) => buffer[index] === byte);
}

function detectType(buffer: Uint8Array): "image" | "font" | null {
  for (const patterns of Object.values(MAGIC_BYTES)) {
    for (const pattern of patterns) {
      if (matchesMagic(buffer, pattern)) return "image";
    }
  }
  for (const patterns of Object.values(FONT_MAGIC)) {
    for (const pattern of patterns) {
      if (matchesMagic(buffer, pattern)) return "font";
    }
  }
  return null;
}

export async function processUpload(formData: FormData) {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    throw new ValidationError("No file provided");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError("File too large (max 10MB)");
  }

  const extension = path.extname(file.name).toLowerCase();
  if (extension === ".svg" || file.type === "image/svg+xml") {
    throw new ValidationError("SVG files are not allowed");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  const fileType = detectType(buffer);
  if (!fileType) {
    throw new ValidationError(
      "Unsupported file type. Allowed: PNG, JPG, WebP, WOFF2, TTF"
    );
  }

  try {
    const id = generateId();
    await mkdir(UPLOAD_DIR, { recursive: true });

    if (fileType === "font") {
      const fontExt = extension === ".woff2" ? ".woff2" : ".ttf";
      const fontDir = path.join(UPLOAD_DIR, "fonts");
      await mkdir(fontDir, { recursive: true });
      const filename = `${id}${fontExt}`;
      await writeFile(path.join(fontDir, filename), Buffer.from(arrayBuffer));
      return { id, url: `/uploads/fonts/${filename}`, type: "font" as const };
    }

    const processed = await sharp(Buffer.from(arrayBuffer))
      .resize(1080, 1080, { fit: "inside", withoutEnlargement: true })
      .toColorspace("srgb")
      .png()
      .toBuffer();

    const filename = `${id}.png`;
    await writeFile(path.join(UPLOAD_DIR, filename), processed);
    return { id, url: `/uploads/${filename}`, type: "image" as const };
  } catch (error) {
    console.error("Upload error:", error);
    throw new InternalServerError("Failed to process upload");
  }
}
