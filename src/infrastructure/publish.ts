import { readFile, readdir } from "fs/promises";
import path from "path";

export async function getCachedJpegs(carouselId: string) {
  const cacheDir = path.resolve(process.cwd(), "data", "exports", carouselId);
  try {
    const files = (await readdir(cacheDir)).filter((file) => file.endsWith(".jpg")).sort();
    if (files.length === 0) return null;
    return await Promise.all(
      files.map(async (name) => ({
        name,
        buffer: await readFile(path.join(cacheDir, name)),
      }))
    );
  } catch {
    return null;
  }
}

export async function uploadPublishedImage(buffer: Buffer, filename: string) {
  const blob = new Blob([new Uint8Array(buffer)], { type: "image/jpeg" });
  const formData = new FormData();
  formData.append("files[]", blob, filename);
  const response = await fetch("https://uguu.se/upload", {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`uguu.se upload failed: ${response.status}`);
  }
  const data = (await response.json()) as { files?: Array<{ url: string }> };
  const url = data.files?.[0]?.url;
  if (!url) {
    throw new Error(`uguu.se returned no URL: ${JSON.stringify(data)}`);
  }
  return url;
}
