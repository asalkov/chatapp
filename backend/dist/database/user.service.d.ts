import { OnModuleInit } from '@nestjs/common';
export interface User {
    id: string;
    username: string;
    email: string;
    password: string;
    createdAt: Date;
    lastLogin?: Date;
}
export interface CreateUserDto {
    username: string;
    email: string;
    password: string;
}
export declare class UserService implements OnModuleInit {
    private readonly logger;
    private users;
    private usernameIndex;
    private emailIndex;
    onModuleInit(): Promise<void>;
    private initializeAdminUser;
    createUser(createUserDto: CreateUserDto): Promise<User>;
    findByUsername(username: string): User | null;
    findByEmail(email: string): User | null;
    findById(id: string): User | null;
    validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
    updateLastLogin(userId: string): void;
    getAllUsers(): User[];
    getUserCount(): number;
    private generateId;
}
