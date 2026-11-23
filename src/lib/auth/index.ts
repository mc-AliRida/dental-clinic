import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UnauthorizedError } from "@/lib/errors";

export const SESSION_COOKIE = "session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function secretKey() {
    const value = process.env.JWT_SECRET;
    if (!value || value.length < 32) {
        throw new Error("JWT_SECRET must be set and at least 32 characters");
    }
    return new TextEncoder().encode(value);
}

export async function signSession(dentistId: string) {
    return new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(dentistId)
        .setIssuedAt()
        .setExpirationTime(`${MAX_AGE_SECONDS}s`)
        .sign(secretKey());
}

export async function setSessionCookie(token: string) {
    (await cookies()).set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: MAX_AGE_SECONDS,
    });
}

export async function clearSessionCookie() {
    (await cookies()).delete(SESSION_COOKIE);
}

export async function requireAuth(): Promise<{ dentistId: string }> {
    const key = secretKey();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) throw new UnauthorizedError();
    try {
        const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
        if (!payload.sub) throw new UnauthorizedError();
        return { dentistId: payload.sub };
    } catch {
        throw new UnauthorizedError();
    }
}