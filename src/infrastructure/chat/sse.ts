export function encodeToken(encoder: TextEncoder, text: string) {
  return encoder.encode(`data: ${JSON.stringify({ type: "token", text })}\n\n`);
}

export function encodeResult(
  encoder: TextEncoder,
  text: string,
  sessionId: string
) {
  return encoder.encode(
    `data: ${JSON.stringify({ type: "result", text, sessionId })}\n\n`
  );
}

export function encodeDone(
  encoder: TextEncoder,
  sessionId: string,
  exitCode: number | null
) {
  return encoder.encode(
    `event: done\ndata: ${JSON.stringify({ sessionId, exitCode })}\n\n`
  );
}

export function encodeError(
  encoder: TextEncoder,
  payload: Record<string, unknown>
) {
  return encoder.encode(`event: error\ndata: ${JSON.stringify(payload)}\n\n`);
}

export function createSseResponse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
