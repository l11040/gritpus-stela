import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: 'http://localhost:50002/api-docs-json',
    },
    output: {
      target: './src/api/generated.ts',
      client: 'fetch',
      mode: 'single',
      override: {
        mutator: {
          path: './src/api/fetcher.ts',
          name: 'fetcher',
        },
      },
    },
  },
});
