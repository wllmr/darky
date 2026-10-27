const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'test-results/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: { ecmaVersion: 'latest' },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        chrome: 'readonly',
        DarkySettings: 'readonly',
        DarkyThemeDetection: 'readonly',
        DarkyThemeStyles: 'readonly',
        DarkyUI: 'readonly',
      },
    },
  },
  {
    files: ['src/background/service-worker.js'],
    languageOptions: { globals: { importScripts: 'readonly' } },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser, chrome: 'readonly' } },
  },
];
