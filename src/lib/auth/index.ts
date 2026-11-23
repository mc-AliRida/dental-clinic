import { SignJWT, jwtVerify } from "jose";

import { UnauthorizedError } from "@/lib/errors";


const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function secretKey() {
    const value = process.env.JWT_SECRET;
    if (!value || value.length < 32) {
        throw new Error("JWT_SECRET must be set and at least 32 characters");
    }
    return new TextEncoder().encode(value);
}

export async function signSession(dentistId: string) {
    const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
    const token = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(dentistId)
        .setIssuedAt()
        .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
        .sign(secretKey());
    return { token, expiresAt: expiresAt.toISOString() };
}




export async function requireAuth(request:Request): Promise<{ dentistId: string }> {
    const key = secretKey();
    const match = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "");
  if (!match) throw new UnauthorizedError("Missing or invalid token");
  try {
    const { payload } = await jwtVerify(match[1], key, { algorithms: ["HS256"] });
    if (!payload.sub) throw new UnauthorizedError("Missing or invalid token");
    return { dentistId: payload.sub };
  } catch {
    throw new UnauthorizedError("Missing or invalid token");
  }
}