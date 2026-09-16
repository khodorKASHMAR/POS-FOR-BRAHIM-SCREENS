import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [vue(), basicSsl()], // HTTPS so phone Chrome can use the camera
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8087',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'http://localhost:8087',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
