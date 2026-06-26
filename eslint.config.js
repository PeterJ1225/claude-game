import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public', '*.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // 逻辑层（systems/core/save/utils/data）禁止「值 import」phaser 与 entities/；
    // phaser 仅允许 import type。见 SPEC 4.1/4.2/10.2。
    files: ['src/systems/**/*.ts', 'src/core/**/*.ts', 'src/save/**/*.ts', 'src/utils/**/*.ts', 'src/data/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'phaser', message: '逻辑层禁止值 import phaser；如需类型用 import type。', allowTypeImports: true },
          ],
          patterns: [
            { group: ['**/entities/*', '**/entities'], message: '逻辑层禁止 import entities/（表现层）。' },
          ],
        },
      ],
    },
  },
  {
    // Node 构建脚本：提供 Node 全局
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  prettier,
);
