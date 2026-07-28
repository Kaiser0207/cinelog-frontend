import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// `npm run lint` has been in package.json since the start, and every plugin it needs is
// in devDependencies — but there has never been a config file, so the script has always
// exited with "ESLint couldn't find an eslint.config.js". Which means the rule that
// would have caught the broken search on the day it was written —
// react-hooks/exhaustive-deps, on a useCallback that read searchQuery without listing
// it — has never once run.
export default [
  { ignores: ['dist/**', 'node_modules/**', 'public/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Hooks 7's recommended preset also enables React Compiler-oriented
      // architecture rules. This app intentionally starts async loads and resets
      // loading state from effects, uses refs for pointer animation state, and keeps
      // one score renderer local to its detail view. Treating all three established
      // patterns as migration-blocking errors would require a broad behavior rewrite,
      // so retain the two correctness checks below without expanding lint scope here.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',

      // The automatic JSX runtime does not require React-in-scope rules. Core
      // no-unused-vars still cannot see JSX-only component identifiers (including the
      // lowercase `motion` namespace), so ignore those names and keep this rule focused
      // on ordinary dead imports and locals. This also avoids retaining the React
      // plugin solely for bookkeeping rules it no longer needs to provide.
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^(?:motion|[A-Z_].*)$',
        args: 'none',
        caughtErrors: 'none',
      }],

      // A warning, not an error: several effects here deliberately run once on mount and
      // say so in a comment. But it has to SPEAK, because when it's right it is right
      // about something that silently returns the wrong data.
      'react-hooks/exhaustive-deps': 'warn',

      // Files that export a hook or a constant alongside a component are a normal shape
      // in this codebase (AdminAuth, LanguageContext, Toast). This rule only guards HMR.
      'react-refresh/only-export-components': 'off',
    },
  },
]
