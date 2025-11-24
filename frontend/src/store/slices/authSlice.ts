import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { isAdmin as checkIsAdmin } from '../../config/admin';
import { clearAllStorage } from '../../utils/storage';

interface AuthState {
  username: string;
  email: string;
  password: string;
  isLoggedIn: boolean;
  loginError: string;
  isAdmin: boolean;
  isRegistering: boolean; // true = register new user, false = login existing
}

const initialState: AuthState = {
  username: '',
  email: '',
  password: '',
  isLoggedIn: false,
  loginError: '',
  isAdmin: false,
  isRegistering: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ username: string; email?: string; password: string; isRegistering: boolean }>) => {
      state.username = action.payload.username;
      state.email = action.payload.email || '';
      state.password = action.payload.password;
      state.isLoggedIn = true;
      state.loginError = '';
      state.isAdmin = checkIsAdmin(action.payload.username);
      state.isRegistering = action.payload.isRegistering;
    },
    logout: (state) => {
      state.username = '';
      state.email = '';
      state.password = '';
      state.isLoggedIn = false;
      state.loginError = '';
      state.isAdmin = false;
      state.isRegistering = false;
      // Clear all localStorage data
      clearAllStorage();
    },
    setLoginError: (state, action: PayloadAction<string>) => {
      state.loginError = action.payload;
    },
    clearLoginError: (state) => {
      state.loginError = '';
    },
  },
});

export const { login, logout, setLoginError, clearLoginError } = authSlice.actions;
export default authSlice.reducer;
