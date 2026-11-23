import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { withRequestLog } from "@/lib/request-log";

/** GET who is logged in */
export const GET = withRequestLog(async () => {
  try {
    const { dentistId } = await requireAuth();
    return NextResponse.json({ id: dentistId });
  } catch (error) {
    return handleError(error);
  }
});