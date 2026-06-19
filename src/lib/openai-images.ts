import type { AspectRatio } from "@/types/carousel";

export type ImageGenerationQuality = "low" | "medium" | "high" | "auto";

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return "";
  return key.toLowerCase().startsWith("bearer ") ? key : `Bearer ${key}`;
}

export function getImageGenerationSize(aspectRatio: AspectRatio) {
  if (aspectRatio === "1:1") return "1024x1024";
  if (aspectRatio === "9:16") return "1024x1824";
  return "1024x1280";
}

export async function generateOpenAIImage(params: {
  prompt: string;
  aspectRatio: AspectRatio;
  quality?: ImageGenerationQuality;
}) {
  const authorization = getOpenAIKey();
  if (!authorization) {
    throw new Error("OPENAI_API_KEY no configurada.");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2",
      prompt: params.prompt,
      size: getImageGenerationSize(params.aspectRatio),
      quality: params.quality || process.env.OPENAI_IMAGE_QUALITY?.trim() || "medium",
      output_format: "png",
      n: 1,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `OpenAI image generation failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const base64 = data.data?.[0]?.b64_json;
  if (!base64) {
    throw new Error(`OpenAI no devolvio una imagen valida: ${JSON.stringify(data)}`);
  }

  return Buffer.from(base64, "base64");
}
