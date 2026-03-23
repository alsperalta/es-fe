import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // All /api/* requests → Spring Boot on port 8080
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  },
  preview: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '4173'),
      allowedHosts: ['.railway.app'],
  },
  build: {
    outDir: 'dist',
    // outDir: '../solarpro-backend/src/main/resources/static',
    emptyOutDir: true,
  }
})
