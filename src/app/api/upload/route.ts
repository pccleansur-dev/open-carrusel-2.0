import { NextResponse } from "next/server";
import { handleRouteError } from "@/app/api/_shared/responses";
import { processUpload } from "@/infrastructure/uploads";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await processUpload(formData);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
