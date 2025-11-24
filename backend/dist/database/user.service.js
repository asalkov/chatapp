"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
let UserService = class UserService {
    logger = new common_1.Logger('UserService');
    users = new Map();
    usernameIndex = new Map();
    emailIndex = new Map();
    async onModuleInit() {
        await this.initializeAdminUser();
    }
    async initializeAdminUser() {
        const adminUsername = 'admin';
        const adminEmail = 'admin@chatapp.com';
        const adminPassword = 'admin';
        if (this.usernameIndex.has(adminUsername.toLowerCase())) {
            this.logger.log('Admin user already exists');
            return;
        }
        try {
            await this.createUser({
                username: adminUsername,
                email: adminEmail,
                password: adminPassword,
            });
            this.logger.log('Default admin user created (username: admin, password: admin)');
        }
        catch (error) {
            this.logger.error('Failed to create admin user', error);
        }
    }
    async createUser(createUserDto) {
        const { username, email, password } = createUserDto;
        if (this.usernameIndex.has(username.toLowerCase())) {
            throw new Error('Username already exists');
        }
        if (this.emailIndex.has(email.toLowerCase())) {
            throw new Error('Email already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = {
            id: this.generateId(),
            username,
            email,
            password: hashedPassword,
            createdAt: new Date(),
        };
        this.users.set(user.id, user);
        this.usernameIndex.set(username.toLowerCase(), user.id);
        this.emailIndex.set(email.toLowerCase(), user.id);
        this.logger.log(`User created: ${username} (${email})`);
        return user;
    }
    findByUsername(username) {
        const userId = this.usernameIndex.get(username.toLowerCase());
        if (!userId) {
            return null;
        }
        return this.users.get(userId) || null;
    }
    findByEmail(email) {
        const userId = this.emailIndex.get(email.toLowerCase());
        if (!userId) {
            return null;
        }
        return this.users.get(userId) || null;
    }
    findById(id) {
        return this.users.get(id) || null;
    }
    async validatePassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
    updateLastLogin(userId) {
        const user = this.users.get(userId);
        if (user) {
            user.lastLogin = new Date();
            this.logger.log(`Updated last login for user: ${user.username}`);
        }
    }
    getAllUsers() {
        return Array.from(this.users.values());
    }
    getUserCount() {
        return this.users.size;
    }
    generateId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)()
], UserService);
//# sourceMappingURL=user.service.js.map