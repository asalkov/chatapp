import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch } from './store/hooks';
import { login } from './store/slices/authSlice';
import { loadPersistedUsers } from './store/slices/usersSlice';
import { getAccessToken, loadUsersFromStorage } from './utils/storage';
import { authService } from './services/authService';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import InvitationAccept from './components/InvitationAccept';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const dispatch = useAppDispatch();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      
      if (token) {
        try {
          // Validate the token with the backend
          const result = await authService.validateToken(token);
          
          if (result.success && result.user) {
            // Token is valid, restore the user session
            dispatch(login({ 
              username: result.user.username, 
              email: result.user.email || '', 
              password: '', 
              isRegistering: false 
            }));
            
            // Load persisted users for this username
            const persistedUsers = loadUsersFromStorage(result.user.username);
            if (persistedUsers.length > 0) {
              console.log(`📦 Auto-login: Loading ${persistedUsers.length} user contact(s) for ${result.user.username}`);
              dispatch(loadPersistedUsers(persistedUsers));
            }
            
            console.log('✅ Auto-login successful for:', result.user.username);
          }
        } catch (error) {
          console.log('❌ Auto-login failed, token may be expired');
          // Token is invalid, user will need to login again
        }
      }
      
      setIsInitializing(false);
    };

    initializeAuth();
  }, [dispatch]);

  // Show loading while checking authentication
  if (isInitializing) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '2rem', 
            marginBottom: '1rem',
            animation: 'spin 1s linear infinite'
          }}>
            ⚡
          </div>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route 
        path="/chat" 
        element={
          <ProtectedRoute requireNonAdmin>
            <ChatPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requireAdmin>
            <AdminPage />
          </ProtectedRoute>
        } 
      />
      <Route path="/invite/:token" element={<InvitationAccept />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

