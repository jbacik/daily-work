import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'forks',
    server: {
      deps: {
        inline: ['@asamuzakjp/css-color', '@csstools/css-calc'],
      },
    },
    env: {
      TZ: 'America/New_York',
    },
  },
})
