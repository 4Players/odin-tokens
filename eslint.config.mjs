import tseslint from 'typescript-eslint';

export default tseslint.config({
  plugins: {
    '@typescript-eslint': tseslint.plugin,
  },
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
    },
  },
  files: ['**/src/*.ts'],
  ignores: ['**/lib/*.ts'],
  rules: {
    camelcase: 'off',
    'comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
      },
    ],
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      },
    ],
  },
});
