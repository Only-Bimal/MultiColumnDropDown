import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'OmniCombo',
      fileName: (format) => {
        if (format === 'iife') return 'omnicombo.standalone.js';
        if (format === 'es') return 'omnicombo.module.js';
        if (format === 'umd') return 'omnicombo.commonjs.js';
        return `omnicombo.${format}.js`;
      },
      formats: ['es', 'umd', 'iife']
    },
    rollupOptions: {
      output: {
        exports: 'named'
      }
    },
    sourcemap: true,
    minify: 'esbuild'
  },
  server: {
    port: 3000,
    open: '/demo/index.html'
  }
});
