import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      '**/.claude/**',
      '**/.omc/**',
      '**/.omx/**',
      '**/.osc/research/**',
      '**/.osc/runs/**',
      '**/.osc/state/**',
    ],
  },
});
