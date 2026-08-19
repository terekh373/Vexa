import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.expo/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Project rule: no implicit or explicit `any`
      '@typescript-eslint/no-explicit-any': 'error',
      // Underscore prefix marks a parameter kept for signature shape only —
      // Express error middleware must declare four parameters to be recognised.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  // Frontend — Browser
  {
    files: ['apps/web/**/*.{js,jsx,ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
);