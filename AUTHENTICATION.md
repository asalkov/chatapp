# Authentication System

## Overview

The chat application now includes a complete authentication system with user registration, login, JWT tokens, and secure password hashing.

## Features

### Backend

#### Security
- **Password Hashing**: Uses bcrypt with salt rounds of 10
- **JWT Tokens**: Secure token-based authentication with 7-day expiration
- **Protected Routes**: JWT authentication guard for protected endpoints

#### Services

**UserService** (`backend/src/database/user.service.ts`)
- Create and manage user accounts
- Secure password hashing with bcrypt
- Username and email uniqueness validation
- User lookup by username, email, or ID
- Password validation
- Last login tracking

**AuthService** (`backend/src/auth/auth.service.ts`)
- User registration with validation
- User login with credential verification
- JWT token generation
- User validation

#### API Endpoints

**Authentication Controller** (`backend/src/auth/auth.controller.ts`)

1. **POST /auth/register**
   - Register a new user
   - Body: `{ username, email, password }`
   - Returns: `{ success, access_token, user }`

2. **POST /auth/login**
   - Login with credentials
   - Body: `{ username, password }`
   - Returns: `{ success, access_token, user }`

3. **GET /auth/profile** (Protected)
   - Get current user profile
   - Requires: JWT token in Authorization header
   - Returns: `{ success, user }`

4. **GET /auth/validate** (Protected)
   - Validate JWT token
   - Requires: JWT token in Authorization header
   - Returns: `{ success, valid, user }`

#### JWT Strategy

**JwtStrategy** (`backend/src/auth/jwt.strategy.ts`)
- Validates JWT tokens from Authorization header
- Extracts user information from token payload
- Verifies user still exists in database

**JwtAuthGuard** (`backend/src/auth/jwt-auth.guard.ts`)
- Protects routes requiring authentication
- Automatically validates JWT tokens

### Frontend

#### Auth Service

**authService** (`frontend/src/services/authService.ts`)

Methods:
- `register(data)` - Register new user
- `login(data)` - Login user
- `logout()` - Clear authentication
- `getToken()` - Get stored JWT token
- `getUser()` - Get stored user data
- `isAuthenticated()` - Check if user is logged in
- `validateToken()` - Validate token with backend

#### Login/Register Component

**Login** (`frontend/src/components/Login.tsx`)

Features:
- Tab-based UI for Login/Register modes
- Registration form with:
  - Username (required, min 2 characters)
  - Email (required, validated format)
  - Password (required, min 6 characters)
  - Confirm Password (must match)
- Login form with:
  - Username (required)
  - Password (required)
- Real-time validation
- Error handling and display
- Automatic token storage on success

## Usage

### Registration

1. Click "Register" tab
2. Enter username (min 2 characters)
3. Enter valid email address
4. Enter password (min 6 characters)
5. Confirm password
6. Click "Create Account"

### Login

1. Click "Login" tab
2. Enter username
3. Enter password
4. Click "Sign In"

### Using Protected Routes

Backend example:
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Get('protected')
getProtectedData(@Request() req) {
  // req.user contains authenticated user info
  return { user: req.user };
}
```

Frontend example:
```typescript
import { authService } from './services/authService';

const token = authService.getToken();

fetch('http://localhost:3000/protected', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Data Models

### User
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  password: string; // hashed
  createdAt: Date;
  lastLogin?: Date;
}
```

### JWT Payload
```typescript
{
  sub: string;      // user ID
  username: string;
  iat: number;      // issued at
  exp: number;      // expiration
}
```

### Auth Response
```typescript
interface AuthResponse {
  success: boolean;
  access_token?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  message?: string;
}
```

## Security Best Practices

### Implemented
✅ Password hashing with bcrypt (10 salt rounds)
✅ JWT tokens with expiration (7 days)
✅ Secure token storage in localStorage
✅ Input validation on both frontend and backend
✅ Email format validation
✅ Username uniqueness enforcement
✅ Email uniqueness enforcement
✅ Minimum password length (6 characters)

### Recommended for Production
- [ ] Use HTTPS only
- [ ] Store JWT secret in environment variables
- [ ] Implement refresh tokens
- [ ] Add rate limiting for auth endpoints
- [ ] Implement account lockout after failed attempts
- [ ] Add email verification
- [ ] Implement password reset functionality
- [ ] Use httpOnly cookies instead of localStorage for tokens
- [ ] Add CSRF protection
- [ ] Implement 2FA (Two-Factor Authentication)
- [ ] Add password strength requirements
- [ ] Log authentication events

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRATION=7d
PORT=3000
```

### Token Expiration

Default: 7 days

To change, update `auth.module.ts`:
```typescript
JwtModule.register({
  secret: process.env.JWT_SECRET,
  signOptions: { expiresIn: '24h' }, // Change to desired duration
})
```

## API Examples

### Register User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_1234567890_abc123",
    "username": "john",
    "email": "john@example.com"
  }
}
```

### Login User
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "password123"
  }'
```

### Access Protected Route
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Error Handling

### Common Errors

**Registration Errors:**
- `Username already exists` - Username is taken
- `Email already exists` - Email is already registered
- `Username must be at least 2 characters`
- `Invalid email address`
- `Password must be at least 6 characters`

**Login Errors:**
- `Invalid credentials` - Wrong username or password
- `Unauthorized` - Token missing or invalid

## Testing

### Manual Testing

1. **Register New User**
   - Open app
   - Click "Register" tab
   - Fill in all fields
   - Submit form
   - Verify token is stored in localStorage
   - Verify redirect to chat

2. **Login Existing User**
   - Logout if logged in
   - Click "Login" tab
   - Enter credentials
   - Submit form
   - Verify successful login

3. **Token Validation**
   - Login successfully
   - Refresh page
   - Verify still logged in (if implementing auto-login)

4. **Logout**
   - Click logout button
   - Verify token is cleared from localStorage
   - Verify redirect to login page

### API Testing with curl

See API Examples section above.

## Troubleshooting

### "Invalid credentials" on login
- Verify username is correct (case-sensitive)
- Verify password is correct
- Check if user exists in database

### Token not working
- Verify token is being sent in Authorization header
- Check token hasn't expired
- Verify JWT_SECRET matches between token creation and validation

### Registration fails
- Check for duplicate username or email
- Verify all required fields are provided
- Check password meets minimum length

### CORS errors
- Verify backend CORS is configured to allow frontend origin
- Check that credentials are being sent correctly

## Future Enhancements

1. **Email Verification**
   - Send verification email on registration
   - Verify email before allowing login

2. **Password Reset**
   - Forgot password functionality
   - Email-based password reset

3. **Refresh Tokens**
   - Implement refresh token rotation
   - Extend session without re-login

4. **OAuth Integration**
   - Google Sign-In
   - GitHub Sign-In
   - Facebook Sign-In

5. **Two-Factor Authentication**
   - TOTP (Time-based One-Time Password)
   - SMS verification
   - Authenticator app support

6. **Account Management**
   - Change password
   - Update email
   - Delete account
   - View login history

7. **Admin Features**
   - User management dashboard
   - Ban/suspend users
   - View user statistics
