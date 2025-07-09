import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import devServer, {defaultOptions } from '@hono/vite-dev-server'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    devServer({
      entry: './src/server.ts',
      exclude: [
        ...defaultOptions.exclude,
        /.*\.svg($|\?)/,
        /^\/(public|assets)\/.+/,
      ],
      injectClientScript: false,
    }),
  ],
})
