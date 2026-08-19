// Riavvio forzato del server di sviluppo per pulire la cache.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: [/[\\/]AppData[\\/]/, /[\\/]ProgramData[\\/]/, /[\\/]Comms[\\/]/],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Disabilita il service worker in modalità sviluppo per evitare errori di "fetch"
      // durante il controllo automatico degli aggiornamenti. Questo non influenzerà
      // il comportamento dell'app in produzione (quando si esegue il build).
      devOptions: {
        enabled: false,
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo png trasp.png'],
      manifest: {
        name: 'R.I.S.O. Master Office',
        short_name: 'R.I.S.O.',
        description: 'Report Individuali Sincronizzati Online per la gestione dei rapportini.',
        theme_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'date-vendor': ['dayjs', 'moment'],
        }
      }
    }
  }
});
