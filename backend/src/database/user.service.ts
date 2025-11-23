import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // hashed
  createdAt: Date;
  lastLogin?: Date;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
}

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger('UserService');
  private users: Map<string, User> = new Map(); // id -> user
  private usernameIndex: Map<string, string> = new Map(); // username -> id
  private emailIndex: Map<string, string> = new Map(); // email -> id

  async onModuleInit() {
    // Create default admin user
    await this.initializeAdminUser();
  }

  private async initializeAdminUser() {
    const adminUsername = 'admin';
    const adminEmail = 'admin@chatapp.com';
    const adminPassword = 'admin';

    // Check if admin already exists
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
    } catch (error) {
      this.logger.error('Failed to create admin user', error);
    }
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, password } = createUserDto;

    // Check if username already exists
    if (this.usernameIndex.has(username.toLowerCase())) {
      throw new Error('Username already exists');
    }

    // Check if email already exists
    if (this.emailIndex.has(email.toLowerCase())) {
      throw new Error('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user: User = {
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

  findByUsername(username: string): User | null {
    const userId = this.usernameIndex.get(username.toLowerCase());
    if (!userId) {
      return null;
    }
    return this.users.get(userId) || null;
  }

  findByEmail(email: string): User | null {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) {
      return null;
    }
    return this.users.get(userId) || null;
  }

  findById(id: string): User | null {
    return this.users.get(id) || null;
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  updateLastLogin(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.lastLogin = new Date();
      this.logger.log(`Updated last login for user: ${user.username}`);
    }
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getUserCount(): number {
    return this.users.size;
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
