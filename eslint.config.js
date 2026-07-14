import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
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
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Without these, no-unused-vars can't see that `motion` is used — it's only ever
      // referenced as <motion.div>, and the base rule doesn't read JSX. Every single
      // file that animates anything came back as "'motion' is defined but never used",
      // which is exactly the kind of noise that gets a linter switched off.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',

      // Components legitimately name unused destructured props and caught errors; what
      // we actually want out of this rule is dead imports and dead locals.
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]',
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
