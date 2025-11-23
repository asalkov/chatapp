// Admin configuration
export const ADMIN_USERNAME = 'admin';

export const isAdmin = (username: string): boolean => {
  return username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
};
