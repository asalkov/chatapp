// Local storage utilities for persisting chat data

const STORAGE_KEYS = {
  CHATS: 'chatapp_chats',
  USERS: 'chatapp_users',
  LAST_USERNAME: 'chatapp_last_username',
} as const;

export interface StoredChat {
  [chatId: string]: any[];
}

export interface StoredUser {
  username: string;
  id: string;
  isOnline?: boolean;
}

// Save chats to localStorage for a specific user
export const saveChatsToStorage = (username: string, chats: Record<string, any[]>) => {
  try {
    const allChats = getAllStoredChats();
    allChats[username] = chats;
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(allChats));
  } catch (error) {
    console.error('Error saving chats to storage:', error);
  }
};

// Load chats from localStorage for a specific user
export const loadChatsFromStorage = (username: string): Record<string, any[]> => {
  try {
    const allChats = getAllStoredChats();
    return allChats[username] || {};
  } catch (error) {
    console.error('Error loading chats from storage:', error);
    return {};
  }
};

// Get all stored chats (for all users)
const getAllStoredChats = (): Record<string, Record<string, any[]>> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHATS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error parsing stored chats:', error);
    return {};
  }
};

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
    const allChats = getAllStoredChats();
    delete allChats[username];
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(allChats));

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
    localStorage.removeItem(STORAGE_KEYS.CHATS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.LAST_USERNAME);
  } catch (error) {
    console.error('Error clearing all storage:', error);
  }
};
