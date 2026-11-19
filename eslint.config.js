import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // reui/ y shadcn/ son código de terceros copiado con la CLI de shadcn: se actualiza desde el registro, no se corrige aquí
  { ignores: ['dist/', 'node_modules/', 'release/', 'src/components/reui/', 'src/components/shadcn/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['server.cjs', 'electron/**'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Solo las dos reglas clásicas: las del React Compiler (v7) no aplican a este proyecto.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
    },
  },
  {
    files: ['tests/**', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
);
