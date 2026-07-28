# CineRooms frontend

React/Vite frontend for [cinerooms.vercel.app](https://cinerooms.vercel.app/).
The frontend is deployed separately from the Render API.

## Local development

Use Node.js 22.22 or newer within the Node 22 release line, then install the
exact locked dependency versions:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `VITE_API_URL` to the backend origin. For example:

```dotenv
VITE_API_URL=http://localhost:8000
```

Do not put API keys or admin credentials in a `VITE_*` variable: Vite embeds
those values in the public browser bundle.

## Required checks

Run the same command used by CI before opening a pull request or deploying:

```bash
npm run check
```

It runs ESLint, the Node unit tests, and a production Vite build. GitHub Actions
also audits the locked dependency tree at high severity after these checks pass.
To inspect the production output locally:

```bash
npm run preview
```

## Deployment notes

- Vercel serves the generated `dist/` assets and applies the routes, cache
  policy, CSP, and other security headers in `vercel.json`.
- `/`, `/stats`, `/suggestions`, and `/review/:id` are SPA entry routes.
  Unknown direct paths intentionally remain Vercel 404 responses.
- The production API is hosted separately on Render. `VITE_API_URL` must match
  that HTTPS origin, and the same origin must be allowed by the `connect-src`
  directive in `vercel.json`.
- The UI requests lightweight review summaries and `/api/reviews/catalog`.
  Compatibility fallbacks allow the frontend and backend to deploy in either
  order, but Render free-tier releases may still require a manual deploy.
- Review-specific Google Fonts are loaded on demand. Keep new body fonts out of
  `index.html` unless they are truly required for the initial UI.
