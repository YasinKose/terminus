import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main/index.ts'],
  outDir: 'dist/main',
  format: ['esm'],
  platform: 'node',
  clean: true,
  external: ['electron'],
});
