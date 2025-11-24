import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import type { RegisterDto, LoginDto } from './auth.service';
interface AuthenticatedRequest extends ExpressRequest {
    user: {
        userId: number;
        username: string;
        email: string;
    };
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
            email: string;
        };
        success: boolean;
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
            email: string;
        };
        success: boolean;
    }>;
    getProfile(req: AuthenticatedRequest): {
        success: boolean;
        user: {
            userId: number;
            username: string;
            email: string;
        };
    };
    validateToken(req: AuthenticatedRequest): {
        success: boolean;
        valid: boolean;
        user: {
            userId: number;
            username: string;
            email: string;
        };
    };
}
export {};
