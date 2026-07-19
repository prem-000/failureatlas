import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Run in a Node environment (no browser needed for unit tests)
    environment: 'node',
    // Only pick up files under tests/
    include: ['tests/**/*.test.ts'],
    // Exclude Playwright e2e tests
    exclude: ['tests/**/*.spec.ts', 'node_modules/**'],
    // Clear mocks between tests
    clearMocks: true,
    // Verbose output
    reporter: 'verbose',
  },
  resolve: {
    alias: {
      // Mirror the tsconfig path alias used in the project
      '@': path.resolve(__dirname, './src'),
    },
  },
});
