import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_URL;

  return {
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
        '/translate-api': {
          target: 'https://translate.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/translate-api/, ''),
        },
        '/lingva-api': {
          target: 'https://lingva.ml',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/lingva-api/, ''),
        },
        '/mymemory-api': {
          target: 'https://api.mymemory.translated.net',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/mymemory-api/, ''),
        },
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/ws': {
          target: backendUrl,
          ws: true,
          changeOrigin: true,
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
          secure: false, // For local dev against remote HTTPS
          headers: {
            'Origin': backendUrl,
            'Referer': backendUrl,
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
  }
})