import sharp from "sharp";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function findFirstStringByKeys(value: unknown, keys: string[]): string | null {
  if (typeof value === "string") {
    return null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findFirstStringByKeys(entry, keys);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(value)) {
    const found = findFirstStringByKeys(nestedValue, keys);
    if (found) return found;
  }

  return null;
}

export async function convertPngExportsToJpegs(
  pngBuffers: { name: string; buffer: Buffer }[]
) {
  return Promise.all(
    pngBuffers.map(async ({ name, buffer }) => ({
      name: name.replace(/\.png$/i, ".jpg"),
      buffer: await sharp(buffer).jpeg({ quality: 92 }).toBuffer(),
    }))
  );
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

export async function parsePublishResponse(
  response: Response
): Promise<{ publishedPostId: string | null; publishedPostUrl: string | null }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as unknown;
    return {
      publishedPostId: findFirstStringByKeys(payload, [
        "id",
        "post_id",
        "media_id",
        "creation_id",
        "instagram_post_id",
      ]),
      publishedPostUrl: findFirstStringByKeys(payload, [
        "permalink",
        "post_url",
        "instagram_post_url",
        "url",
      ]),
    };
  }

  const text = (await response.text()).trim();
  const urlMatch = text.match(/https?:\/\/\S+/i);
  return {
    publishedPostId: null,
    publishedPostUrl: urlMatch?.[0] ?? null,
  };
}
