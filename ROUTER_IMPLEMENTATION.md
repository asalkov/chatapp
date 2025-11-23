# React Router Implementation

## Overview
The chat application has been refactored to use React Router for navigation instead of conditional rendering.

## Changes Made

### 1. New Page Components (`src/pages/`)
- **LoginPage.tsx** - Handles user login and redirects based on role
- **ChatPage.tsx** - Main chat interface for regular users
- **AdminPage.tsx** - Admin panel for managing users and chats

### 2. Protected Routes (`src/components/ProtectedRoute.tsx`)
A reusable component that:
- Redirects unauthenticated users to login
- Enforces role-based access (admin vs regular users)
- Prevents admins from accessing chat and vice versa

### 3. Simplified App.tsx
Now serves as the main router with clean route definitions:
```tsx
<Routes>
  <Route path="/" element={<LoginPage />} />
  <Route path="/chat" element={<ProtectedRoute requireNonAdmin><ChatPage /></ProtectedRoute>} />
  <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
  <Route path="/invite/:token" element={<InvitationAccept />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

### 4. Updated main.tsx
Simplified to wrap App with BrowserRouter only.

## Routes

| Path | Component | Access |
|------|-----------|--------|
| `/` | LoginPage | Public |
| `/chat` | ChatPage | Authenticated non-admin users only |
| `/admin` | AdminPage | Authenticated admin users only |
| `/invite/:token` | InvitationAccept | Public |
| `*` | Redirect to `/` | Fallback |

## Benefits

1. **Better Code Organization** - Separation of concerns with dedicated page components
2. **Cleaner Navigation** - Use `useNavigate()` hook instead of conditional rendering
3. **Protected Routes** - Centralized authentication and authorization logic
4. **URL-based Navigation** - Users can bookmark specific pages
5. **Better UX** - Browser back/forward buttons work correctly
6. **Easier Testing** - Each page component can be tested independently

## Usage Examples

### Navigate programmatically:
```tsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/chat'); // Go to chat page
navigate('/admin', { replace: true }); // Replace current history entry
```

### Access route parameters:
```tsx
import { useParams } from 'react-router-dom';

const { token } = useParams(); // Get :token from /invite/:token
```

### Link to routes:
```tsx
import { Link } from 'react-router-dom';

<Link to="/chat">Go to Chat</Link>
```

## Migration Notes

- All navigation logic now uses React Router's `useNavigate()` hook
- Authentication redirects happen automatically via `ProtectedRoute`
- Role-based access is enforced at the route level
- No breaking changes to existing functionality
