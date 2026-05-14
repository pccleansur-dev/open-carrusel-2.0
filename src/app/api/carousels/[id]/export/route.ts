import { exportCarouselUseCase } from "@/application/exports";
import { handleRouteError } from "@/app/api/_shared/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await exportCarouselUseCase(id);

    return new Response(new Uint8Array(result.zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.downloadName}"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
