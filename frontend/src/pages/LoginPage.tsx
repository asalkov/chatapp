import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login, clearLoginError } from '../store/slices/authSlice';
import { loadPersistedUsers } from '../store/slices/usersSlice';
import { loadUsersFromStorage } from '../utils/storage';
import { CssBaseline } from '@mui/material';
import Login from '../components/Login';

function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoggedIn, loginError, isAdmin } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (isLoggedIn) {
      // Redirect based on user role
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/chat', { replace: true });
      }
    }
  }, [isLoggedIn, isAdmin, navigate]);

  const handleLogin = (name: string) => {
    dispatch(login(name));
    dispatch(clearLoginError());
    
    // Load persisted users for this username
    const persistedUsers = loadUsersFromStorage(name);
    
    if (persistedUsers.length > 0) {
      console.log(`📦 Loading ${persistedUsers.length} user contact(s) for ${name}`);
      dispatch(loadPersistedUsers(persistedUsers));
    }
  };

  return (
    <>
      <CssBaseline />
      <Login onLogin={handleLogin} error={loginError} />
    </>
  );
}

export default LoginPage;
