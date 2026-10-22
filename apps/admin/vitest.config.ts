import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // Testes de componente (.tsx) renderizam com react-dom/server, sem DOM.
  esbuild: { jsx: 'automatic' },
  test: { include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'], environment: 'node' },
});
