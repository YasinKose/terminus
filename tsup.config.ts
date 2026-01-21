import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main/index.ts', 'src/main/preload.ts'],
  outDir: 'dist/main',
  format: ['esm'],
  platform: 'node',
  clean: true,
  external: ['electron'],
});
