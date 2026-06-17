import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: [...configDefaults.exclude, '**/.claude/**'],
  },
});
