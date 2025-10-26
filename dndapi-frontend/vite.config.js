import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    // Proxy in dev per evitare eventuali problemi CORS
    proxy: {
      '/api': {
        target: 'https://dndapi.giuseppedallape.com/',
        changeOrigin: true,
        secure: true
      }
    }
  }
});