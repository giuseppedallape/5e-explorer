import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: [

      'dndrules.giuseppedallape.com',

    ],
    proxy: {
      '/api': {
        target: 'https://dndapi.giuseppedallape.com/',
        changeOrigin: true,
        secure: true
      }
    }
  }
});