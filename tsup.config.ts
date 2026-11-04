import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.tsx',      // Lightweight renderer entry
    builder: 'src/builder.tsx',  // Heavy builder entry
    merge: 'src/merge.tsx',      // Diff and merge of two form versions
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,  // Enable code splitting for better tree-shaking
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  treeshake: true,  // Enable tree-shaking
  esbuildOptions(options: any) {
    options.jsx = 'automatic';
  },
});