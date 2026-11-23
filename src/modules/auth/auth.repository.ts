import { prisma } from "@/lib/prisma";

export interface AuthRepository {
  findByEmail(email: string): Promise<{ id: string; password_hash: string } | null>;
}

export const authRepository: AuthRepository = {
  findByEmail: (email) =>
    prisma.dentist.findUnique({
      where: { email },
      select: { id: true, password_hash: true },
    }),
};