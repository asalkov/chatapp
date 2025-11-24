import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { username, email, password } = registerDto;

    // Validate input
    if (!username || username.length < 2) {
      throw new Error('Username must be at least 2 characters');
    }

    if (!email || !this.isValidEmail(email)) {
      throw new Error('Invalid email address');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    try {
      const user = await this.userService.createUser({
        username,
        email,
        password,
      });

      this.logger.log(`User registered: ${username}`);

      return this.generateAuthResponse(user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Registration failed';
      this.logger.error(`Registration failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { username, password } = loginDto;

    // Find user
    const user = this.userService.findByUsername(username);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await this.userService.validatePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    this.userService.updateLastLogin(user.id);

    this.logger.log(`User logged in: ${username}`);

    return this.generateAuthResponse(user);
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userService.findById(userId);
  }

  private generateAuthResponse(user: User): AuthResponse {
    const payload = { sub: user.id, username: user.username };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
