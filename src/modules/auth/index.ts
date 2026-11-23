import { authRepository } from "./auth.repository";
import { AuthService } from "./auth.service";

export const authService = new AuthService(authRepository);