"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const user_service_1 = require("../database/user.service");
let AuthService = class AuthService {
    userService;
    jwtService;
    logger = new common_1.Logger('AuthService');
    constructor(userService, jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }
    async register(registerDto) {
        const { username, email, password } = registerDto;
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            this.logger.error(`Registration failed: ${errorMessage}`);
            throw new Error(errorMessage);
        }
    }
    async login(loginDto) {
        const { username, password } = loginDto;
        const user = this.userService.findByUsername(username);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await this.userService.validatePassword(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        this.userService.updateLastLogin(user.id);
        this.logger.log(`User logged in: ${username}`);
        return this.generateAuthResponse(user);
    }
    async validateUser(userId) {
        return this.userService.findById(userId);
    }
    generateAuthResponse(user) {
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
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map