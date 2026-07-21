import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.expo/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Project rule: no implicit or explicit `any`
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);