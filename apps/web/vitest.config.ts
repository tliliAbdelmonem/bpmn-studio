import { defineConfig } from 'vitest/config';

// Loaded by the Angular unit-test builder (`runnerConfig` in project.json).
export default defineConfig({
  test: {
    server: {
      deps: {
        // @bpmn-io/properties-panel ships a vendored preact whose hooks use a bare directory
        // import ("../..") that Node's ESM loader rejects; let Vite resolve it instead.
        inline: [/@bpmn-io[\\/]properties-panel/],
      },
    },
  },
});
