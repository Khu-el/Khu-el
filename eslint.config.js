// Bug-catching rules only -- no formatting or style opinions. The repo had no linter
// at all; this exists to catch real defects (unused/shadowed values, floating promises
// in server handlers, hook-dependency mistakes), not to restyle existing code.
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'build/**', '.neterverse/**', 'web/**', 'nte-command-center/**', 'scripts/**', '**/*.config.{js,ts}'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.base],
    plugins: { '@typescript-eslint': tseslint.plugin, 'react-hooks': reactHooks },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      'no-undef': 'off',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-else-if': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-unsafe-finally': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-cond-assign': 'error',
      'no-duplicate-case': 'error',
      'no-fallthrough': 'error',
      'no-sparse-arrays': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'require-atomic-updates': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Express 4 ignores the promise an async handler returns, so a rejection after the first
    // await is unhandled and Node exits (CLAUDE.md: every async route goes through asyncHandler).
    // no-misused-promises flags a bare async handler; no-floating-promises flags a dropped promise.
    files: ['server/src/**/*.ts'],
    ignores: ['server/src/**/*.test.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
);
