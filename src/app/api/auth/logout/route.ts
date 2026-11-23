import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { withRequestLog } from "@/lib/request-log";

// clear the session cookie 
export const POST = withRequestLog(async () => {
  try {
    await clearSessionCookie();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
});