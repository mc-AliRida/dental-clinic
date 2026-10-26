import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

// One PrismaClient for the whole app (cached on globalThis so dev hot reload doesn't open new pools).
// Certificate validation stays ON. When DB_CA_CERT is set, the server certificate is checked
// against that pinned certificate. Never copy `rejectUnauthorized: false` from the seed.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");

  const ca = process.env.DB_CA_CERT?.replace(/\\n/g, "\n");
  let connectionString = raw;
  let ssl: { ca: string; checkServerIdentity: () => undefined } | undefined;

  if (ca) {
    const url = new URL(raw);
    url.searchParams.delete("sslmode"); // otherwise it overrides the ssl option below
    connectionString = url.toString();
    // Chain is verified against the pinned cert; hostname check is skipped because
    // the proxy hostname does not match the certificate's name.
    ssl = { ca, checkServerIdentity: () => undefined };
  }

  const adapter = new PrismaPg({ connectionString, ...(ssl ? { ssl } : {}) });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
