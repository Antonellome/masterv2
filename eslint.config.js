import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import typescriptParser from '@typescript-eslint/parser';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';

export default defineConfig([
  globalIgnores(['dist']),

  // Configurazione per file JavaScript (JS e JSX)
  {
    files: ['**/*.{js,jsx}'],
    // Composizione manuale delle configurazioni
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // Configurazione per file TypeScript (TS e TSX)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tsEslintPlugin,
      'react-hooks': reactHooks, // Applica anche a TSX
      'react-refresh': reactRefresh, // Applica anche a TSX
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsEslintPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      'no-unused-vars': 'off', // Disabilita la regola base per usare quella di TypeScript
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^' }],
    },
  },
]);
