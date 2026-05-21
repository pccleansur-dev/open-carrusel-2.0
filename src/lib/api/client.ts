export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Fall back to response text below.
  }

  try {
    const text = await response.text();
    if (text.trim()) return text;
  } catch {
    // Ignore unreadable bodies.
  }

  return `Request failed with status ${response.status}`;
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }
  return response.json() as Promise<T>;
}

export async function sendJson<TResponse, TBody = unknown>(
  input: RequestInfo | URL,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: TBody
): Promise<TResponse> {
  return fetchJson<TResponse>(input, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
