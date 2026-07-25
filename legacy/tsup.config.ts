import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/main/index.ts'],
    outDir: 'dist/main',
    format: ['esm'], // Main process as ESM
    platform: 'node',
    clean: true,
    external: ['electron'],
  },
  {
    entry: ['src/main/preload.ts'],
    outDir: 'dist/main',
    format: ['cjs'], // Preload as CJS (Critical fix)
    platform: 'node',
    external: ['electron'],
    // No clean here, or it deletes what index.ts built
  }
]);
