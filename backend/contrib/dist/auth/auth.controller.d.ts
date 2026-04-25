import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    refresh(authHeader: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}
