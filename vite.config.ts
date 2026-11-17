import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const sourceRoot = fileURLToPath(new URL('./src', import.meta.url));
const publicDirectory = fileURLToPath(new URL('./public', import.meta.url));
const outputDirectory = fileURLToPath(new URL('./dist', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, 'PUBLIC_');

  return {
    root: sourceRoot,
    publicDir: publicDirectory,
    plugins: [react()],
    base: env.PUBLIC_BASE_URL ? new URL(env.PUBLIC_BASE_URL).pathname : '/',
    input: {
      main: 'index.html',
      config: 'config/index.html',
    },
    build: {
      outDir: outputDirectory,
      emptyOutDir: true,
    },
    test: { root: projectRoot, environment: 'node', restoreMocks: true },
  };
});
