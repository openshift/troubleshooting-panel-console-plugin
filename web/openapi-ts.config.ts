import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../korrel8r/korrel8r-openapi.yaml',
  output: {
    path: 'src/korrel8r/client',
    postProcess: ['prettier'],
  },
});
