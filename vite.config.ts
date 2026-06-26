import { defineConfig } from 'vite';

// base:'./' 与相对资源路径是【v2.2.1】资源路径硬规范，避免打包后白屏。
export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: { target: 'es2020', outDir: 'dist' },
});
