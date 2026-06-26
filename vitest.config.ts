import { defineConfig } from 'vitest/config';

// 测试只跑纯逻辑层（不 import Phaser），故用 node 环境，符合 SPEC 4.1/10.3。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
