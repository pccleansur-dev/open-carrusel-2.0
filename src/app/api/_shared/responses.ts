import { NextResponse } from "next/server";
import { ApplicationError } from "@/application/errors";

export function handleRouteError(error: unknown) {
  if (error instanceof ApplicationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
