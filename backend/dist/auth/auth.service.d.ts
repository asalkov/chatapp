import { JwtService } from '@nestjs/jwt';
import { UserService, User } from '../database/user.service';
export interface RegisterDto {
    username: string;
    email: string;
    password: string;
}
export interface LoginDto {
    username: string;
    password: string;
}
export interface AuthResponse {
    access_token: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
}
export declare class AuthService {
    private readonly userService;
    private readonly jwtService;
    private readonly logger;
    constructor(userService: UserService, jwtService: JwtService);
    register(registerDto: RegisterDto): Promise<AuthResponse>;
    login(loginDto: LoginDto): Promise<AuthResponse>;
    validateUser(userId: string): Promise<User | null>;
    private generateAuthResponse;
    private isValidEmail;
}
