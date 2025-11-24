import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  // Explicitly set appType to 'spa' for client-side routing support
  appType: 'spa',
})
