import { NextResponse, type NextRequest } from "next/server";
import { AppError, UnauthorizedError } from "@/lib/errors";
import { handleError } from "@/lib/http";
import { withRequestLog } from "@/lib/request-log";
import {  signSession } from "@/lib/auth";
import { clearLoginFailures, loginAllowed, recordLoginFailure } from "@/lib/rate-limit";
import { authService } from "@/modules/auth";
import { loginSchema } from "@/modules/auth/auth.schema";

export const POST = withRequestLog(async (request: NextRequest) => {
  try {
    const { email, password } = loginSchema.parse(await request.json());
    const key = `${request.headers.get("x-forwarded-for") ?? "local"}:${email}`;
    if (!loginAllowed(key)) {
      throw new AppError(429, "TOO_MANY_ATTEMPTS", "Too many attempts, try again later");
    }
    try {
      const dentist = await authService.login(email, password);
      clearLoginFailures(key);
      return NextResponse.json(await signSession(dentist.id));   // { token, expiresAt }
    } catch (error) {
      if (error instanceof UnauthorizedError) recordLoginFailure(key);
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
});