import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true, // Enables testing the service worker locally during development
      },
      manifest: {
        name: 'Govlyx Platform',
        short_name: 'Govlyx',
        theme_color: '#ffffff',
        display: 'standalone',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // Tells the worker to cache all ui elements
      }
    })
  ],

  define: {
    // sockjs-client (CommonJS) references Node's `global` — polyfill for browser
    global: "globalThis",
  },

  server: {
    proxy: {
      '/external-api': {
        target: 'https://zenquotes.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/external-api/, ''),
      },
      '/api': {
        target: 'https://jan-sahayak-ai-84vh.onrender.com',
        changeOrigin: true,
      },
      '/ws': {
        target: 'https://jan-sahayak-ai-84vh.onrender.com',
        ws: true,
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://jan-sahayak-ai-84vh.onrender.com',
        changeOrigin: true,
        secure: false, // For local dev against remote HTTPS
        headers: {
          'Origin': 'https://jan-sahayak-ai-84vh.onrender.com',
          'Referer': 'https://jan-sahayak-ai-84vh.onrender.com',
        },
        // Avoid 500 errors by rewriting or simple proxy
        rewrite: (path) => path,
      }
    },
  },
  
  preview: {
    port: 5173,
    strictPort: true,
  }
})