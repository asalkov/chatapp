// Local storage utilities for persisting chat data

const STORAGE_KEYS = {
  USERS: 'chatapp_users',
  LAST_USERNAME: 'chatapp_last_username',
  ACCESS_TOKEN: 'chatapp_access_token',
} as const;

export interface StoredUser {
  username: string;
  id: string;
  isOnline?: boolean;
}

// Save users to localStorage for a specific user
export const saveUsersToStorage = (username: string, users: StoredUser[]) => {
  try {
    const allUsers = getAllStoredUsers();
    allUsers[username] = users;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
  } catch (error) {
    console.error('Error saving users to storage:', error);
  }
};

// Load users from localStorage for a specific user
export const loadUsersFromStorage = (username: string): StoredUser[] => {
  try {
    const allUsers = getAllStoredUsers();
    return allUsers[username] || [];
  } catch (error) {
    console.error('Error loading users from storage:', error);
    return [];
  }
};

// Get all stored users (for all users)
const getAllStoredUsers = (): Record<string, StoredUser[]> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error parsing stored users:', error);
    return {};
  }
};

// Save last logged in username
export const saveLastUsername = (username: string) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_USERNAME, username);
  } catch (error) {
    console.error('Error saving last username:', error);
  }
};

// Get last logged in username
export const getLastUsername = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_USERNAME);
  } catch (error) {
    console.error('Error getting last username:', error);
    return null;
  }
};

// Clear all stored data for a user
export const clearUserStorage = (username: string) => {
  try {
    const allUsers = getAllStoredUsers();
    delete allUsers[username];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
  } catch (error) {
    console.error('Error clearing user storage:', error);
  }
};

// Clear all stored data
export const clearAllStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.LAST_USERNAME);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Error clearing all storage:', error);
  }
};

// Save access token
export const saveAccessToken = (token: string) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  } catch (error) {
    console.error('Error saving access token:', error);
  }
};

// Get access token
export const getAccessToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};
