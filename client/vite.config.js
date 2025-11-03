import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
const port = process.env.VITE_PORT || 5173;
const serverTarget = `${process.env.VITE_API_URL || 'http://localhost:3001'}`;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: port,
    proxy: {
      '/api': {
        target: serverTarget,
        changeOrigin: true
      }
    }
  }
})