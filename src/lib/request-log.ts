import type { NextRequest } from "next/server";
import { handleError } from "@/lib/http";
import { logger } from "@/lib/logger";

/**
 * Wraps a route handler and writes one log line per request:
 * method, path (no query string, it can contain patient names), status, duration, request id.
 * 5xx is logged as error, 4xx as warn, the rest as info.
 * The request id is returned in the x-request-id header so a client report can be matched to a log line.
 */
export function withRequestLog<A extends unknown[]>(
  handler: (request: NextRequest, ...args: A) => Promise<Response>,
) {
  return async (request: NextRequest, ...args: A): Promise<Response> => {
    const start = performance.now();
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

    let response: Response;
    try {
      response = await handler(request, ...args);
    } catch (error) {
      // Safety net: a handler that forgot its own try/catch still gets a clean 500.
      response = handleError(error);
    }
    response.headers.set("x-request-id", requestId);

    const entry = {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      status: response.status,
      ms: Math.round(performance.now() - start),
    };
    if (response.status >= 500) logger.error(entry, "request failed");
    else if (response.status >= 400) logger.warn(entry, "request rejected");
    else logger.info(entry, "request");

    return response;
  };
}
