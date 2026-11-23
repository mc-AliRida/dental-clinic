import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

/** One place that turns any thrown error into a consistent JSON response. */
export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const field = issue.path.join(".") || undefined;
    const message = field ? `${field}: ${issue.message}` : issue.message;
    return NextResponse.json(
      { status: 400, field, message }, { status: 400 }
    );
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Request body is not valid JSON" },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.code, message: error.message, ...error.extra },
      { status: error.status },
    );
  }

  logger.error({ err: error }, "unhandled error"); // logged here, never sent to the client
  return NextResponse.json(
    { status: 500, message: "Internal server error" },
    { status: 500 },
  );
}
