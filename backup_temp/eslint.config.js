import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    // File da ignorare globalmente
    ignores: [
      'dist',
      'node_modules',
      'backup_v*',
      'functions/lib',
      '.vite',
      'firebase-debug.log',
      'eslint.config.js', // Ignora il file di configurazione stesso
    ],
  },

  // Configurazione di base per tutti i file (ereditata da tutti)
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Configurazione per i file TypeScript
  ...tseslint.configs.recommended,

  // Configurazione specifica per i file React (TSX/JSX)
  {
    files: ['src/**/*.{jsx,tsx}'],
    plugins: {
      'react': pluginReact,
      'react-refresh': reactRefresh,
      'jsx-a11y': pluginJsxA11y,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
        react: { version: 'detect' },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginJsxA11y.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off', // Disabilitato perché usiamo TypeScript
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Puoi aggiungere qui altre regole specifiche per React
    },
  },
  
  // Regole aggiuntive per le Cloud Functions (ambiente Node.js)
   {
    files: ['functions/src/**/*.ts'],
    languageOptions: {
        globals: {
            ...globals.node,
        }
    }
   }
);
