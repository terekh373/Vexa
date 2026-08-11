import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.expo/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
);