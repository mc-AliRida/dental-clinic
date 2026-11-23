import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

/** One place that turns any thrown error into a consistent JSON response. */
export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid input",
        details: error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
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
      { error: error.code, message: error.message },
      { status: error.status },
    );
  }

  logger.error({ err: error }, "unhandled error"); // logged here, never sent to the client
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "Something went wrong" },
    { status: 500 },
  );
}
