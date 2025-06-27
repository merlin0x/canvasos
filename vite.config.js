import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/renderer',
  base: process.env.ELECTRON === 'true' ? './' : '/',
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@core': resolve(__dirname, 'src/renderer/core'),
      '@components': resolve(__dirname, 'src/renderer/components'),
      '@nodes': resolve(__dirname, 'src/renderer/nodes'),
      '@hooks': resolve(__dirname, 'src/renderer/hooks'),
      '@utils': resolve(__dirname, 'src/renderer/utils'),
      '@styles': resolve(__dirname, 'src/renderer/styles')
    }
  },
  
  plugins: [
    react(),
    electron([
      {
        // Main процес
        entry: 'src/main/index.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        // Preload скрипт
        entry: 'src/main/preload.js',
        onstart(options) {
          // Перезавантаження вікна при зміні preload
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      }
    ]),
    renderer(),
    
  ],
  
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    }
  },
  
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html')
      }
    }
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'rxjs', '@monaco-editor/react']
  }
});