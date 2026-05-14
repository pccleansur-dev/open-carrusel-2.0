import {
  buildChatStreamContext,
  createChatStreamResponse,
} from "@/application/chat";
import { parseChatRequestInput } from "@/contracts/chat";
import { handleRouteError } from "@/app/api/_shared/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const input = parseChatRequestInput(await request.json());
    const context = await buildChatStreamContext(input);
    return createChatStreamResponse(input, context);
  } catch (error) {
    return handleRouteError(error);
  }
}
