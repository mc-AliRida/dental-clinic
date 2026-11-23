import bcrypt from "bcryptjs"; 
import { UnauthorizedError } from "@/lib/errors";
import type { AuthRepository } from "./auth.repository";

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async login(email: string, password: string) {
    const dentist = await this.repo.findByEmail(email);
    const matches = await bcrypt.compare(password, dentist?.password_hash ?? DUMMY_HASH);
    if (!dentist || !matches) throw new UnauthorizedError("Wrong email or password");
    return { id: dentist.id };
  }
}