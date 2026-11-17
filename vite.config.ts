import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, 'PUBLIC_');

  return {
    plugins: [react()],
    base: env.PUBLIC_BASE_URL ? new URL(env.PUBLIC_BASE_URL).pathname : '/',
    build: {
      rolldownOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          config: fileURLToPath(new URL('./config/index.html', import.meta.url)),
        },
      },
    },
    test: { root: projectRoot, environment: 'node', restoreMocks: true },
  };
});
