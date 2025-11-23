import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { isAdmin as checkIsAdmin } from '../../config/admin';

interface AuthState {
  username: string;
  isLoggedIn: boolean;
  loginError: string;
  isAdmin: boolean;
}

const initialState: AuthState = {
  username: '',
  isLoggedIn: false,
  loginError: '',
  isAdmin: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
      state.isLoggedIn = true;
      state.loginError = '';
      state.isAdmin = checkIsAdmin(action.payload);
    },
    logout: (state) => {
      state.username = '';
      state.isLoggedIn = false;
      state.loginError = '';
      state.isAdmin = false;
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
