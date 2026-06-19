import type { IntegrationsConfig } from "@/lib/repositories/integrations-repository";

export interface PostwizMediaAsset {
  id: string;
  path: string;
}

export interface PostwizPostResult {
  postId: string | null;
  postUrl: string | null;
}

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "https://postwiz.wizzi.com.ar/api/public/v1";
  }
  return trimmed.endsWith("/api/public/v1") ? trimmed : `${trimmed}/api/public/v1`;
}

async function readError(response: Response) {
  const text = await response.text().catch(() => "");
  return text || `PostWiz API error: ${response.status}`;
}

export async function uploadPostwizImage(params: {
  config: Pick<IntegrationsConfig, "postwizBaseUrl" | "postwizApiKey">;
  name: string;
  buffer: Buffer;
}): Promise<PostwizMediaAsset> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(params.buffer)], { type: "image/jpeg" });
  formData.append("file", blob, params.name);

  const response = await fetch(`${normalizeBaseUrl(params.config.postwizBaseUrl)}/upload`, {
    method: "POST",
    headers: {
      Authorization: params.config.postwizApiKey,
    },
    body: formData,
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const data = (await response.json()) as Partial<PostwizMediaAsset>;
  if (!data.id || !data.path) {
    throw new Error(`PostWiz upload returned invalid media: ${JSON.stringify(data)}`);
  }

  return { id: data.id, path: data.path };
}

export async function createPostwizPost(params: {
  config: Pick<
    IntegrationsConfig,
    | "postwizBaseUrl"
    | "postwizApiKey"
    | "postwizIntegrationId"
    | "postwizInstagramEnabled"
    | "postwizFacebookEnabled"
    | "postwizFacebookIntegrationId"
    | "postwizFacebookUrl"
    | "postwizProviderType"
    | "postwizPostType"
  >;
  caption: string;
  images: PostwizMediaAsset[];
  scheduledAt?: string | null;
  tags?: string[];
}): Promise<PostwizPostResult> {
  const posts = [];
  if (params.config.postwizInstagramEnabled) {
    posts.push({
      integration: {
        id: params.config.postwizIntegrationId,
      },
      value: [
        {
          content: params.caption,
          image: params.images,
        },
      ],
      settings: {
        __type: params.config.postwizProviderType,
        post_type: params.config.postwizPostType,
        is_trial_reel: false,
        collaborators: [],
      },
    });
  }

  if (params.config.postwizFacebookEnabled) {
    posts.push({
      integration: {
        id: params.config.postwizFacebookIntegrationId,
      },
      value: [
        {
          content: params.caption,
          image: params.images,
        },
      ],
      settings: {
        __type: "facebook",
        ...(params.config.postwizFacebookUrl.trim()
          ? { url: params.config.postwizFacebookUrl.trim() }
          : {}),
      },
    });
  }

  const response = await fetch(`${normalizeBaseUrl(params.config.postwizBaseUrl)}/posts`, {
    method: "POST",
    headers: {
      Authorization: params.config.postwizApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: params.scheduledAt ? "schedule" : "now",
      date: params.scheduledAt ?? new Date().toISOString(),
      shortLink: false,
      tags: params.tags?.map((value) => ({ value })) ?? [],
      posts,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  const firstResult = Array.isArray(payload) ? payload[0] : payload;
  const postId =
    firstResult &&
    typeof firstResult === "object" &&
    "postId" in firstResult &&
    typeof firstResult.postId === "string"
      ? firstResult.postId
      : null;

  return {
    postId,
    postUrl: null,
  };
}
