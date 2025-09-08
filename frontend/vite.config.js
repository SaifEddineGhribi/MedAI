import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 433,
    open: false,
    host: true, 
    allowedHosts: 'all',// 0.0.0.0 for Docker
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: 433,
    },
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})

