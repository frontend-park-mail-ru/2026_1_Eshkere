const {FlatCompat} = require('@eslint/eslintrc');
const eslintConfigPrettier = require('eslint-config-prettier/flat');
const globals = require('globals');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'server/node_modules/**',
      'dist/**',
    ],
  },
  ...compat.extends('google'),
  {
    files: [
      'assets/js/**/*.js',
      'components/**/*.js',
      'layouts/**/*.js',
      'pages/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
  },
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  eslintConfigPrettier,
];
