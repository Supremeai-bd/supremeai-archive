import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Service/store tests run in node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock at the top of the file.
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Playwright owns e2e/**; vitest must not try to execute those specs.
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/types/**',
        'src/data/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      // Ratchet: set just under the current measured baseline so coverage can
      // only go up. Raise these whenever a feature lands with tests.
      thresholds: {
        statements: 24,
        branches: 19,
        functions: 15,
        lines: 24,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
      'firebase/app': path.resolve(
        import.meta.dirname,
        'node_modules/firebase/app/dist/esm/index.esm.js'
      ),
      'firebase/auth': path.resolve(
        import.meta.dirname,
        'node_modules/firebase/auth/dist/esm/index.esm.js'
      ),
    },
  },
});
