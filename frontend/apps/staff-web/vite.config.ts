import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The shared package uses `Platform` from react-native for its web/
      // native branching. react-native itself isn't web-bundleable (it's
      // Metro-specific), so route it through react-native-web here the way
      // customer-mobile's own web preview already does via Metro.
      'react-native': 'react-native-web',
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8001',
        ws: true,
      },
    },
  },
})
