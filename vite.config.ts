import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { demoBogoBridgePlugin } from './vite.demo-bridge-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), demoBogoBridgePlugin()],
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
})
