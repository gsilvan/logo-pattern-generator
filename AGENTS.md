# Repository Guidelines

## Project Structure

- `src/studio/` contains the application, editor, preview, project model, persistence, file import/export, and styles.
- `src/backgrounds/` and `public/banderole/` hold built-in pattern and packaging artwork.
- `src/studio/model.test.ts` and `src/*test.js` contain Vitest tests; `scripts/smoke.mjs` runs browser checks.
- `.github/workflows/` defines validation and GitHub Pages deployment.

## Build, Test, and Development

Use Node.js 20.19 or newer and npm:

```sh
npm ci                 # Install locked dependencies
npm run dev            # Start Vite locally (usually http://localhost:5173)
npm test               # Run Vitest unit tests
npm run build          # Type-check and create the production site in dist/
npm run preview        # Serve the production build locally
npm run test:browser   # Browser smoke test; requires Chromium and a running Vite server
```

For browser checks, start `npm run dev` in another terminal first. Set `CHROMIUM_PATH` if Chromium is installed somewhere other than `/usr/bin/chromium`.

## Code Style and Architecture

The app uses React, strict TypeScript, Vite, Fabric.js, PixiJS, and Zustand. Keep document geometry in millimetres; convert to centimetres for user input and pixels only at rendering/export boundaries. Keep Fabric and Pixi instances as views of the saved project model. Use PascalCase for React component files and types, camelCase for functions and values, and short descriptive module filenames such as `render.ts` or `model.ts`. Match the surrounding formatting; there is no formatter or lint command in `package.json`.

## Testing Guidelines

Add focused Vitest cases for geometry, project validation, and export metadata. Name tests `*.test.ts` or `*.test.js`. Use `npm test` for unit coverage. The Playwright smoke script checks key browser workflows and downloads; run it when changing editor interactions, persistence, or exports. There is no configured coverage threshold.

## Commits and Pull Requests

Use precise Conventional Commit messages, preferably a single concise line. Avoid verbose subjects and body text. For example: `feat: add new project action` or `fix: preserve PNG print resolution`. Pull requests should describe user-visible behavior, list validation commands and results, link related issues when applicable, and include screenshots for UI changes. Mention print-size or export changes explicitly.

Create commits only when explicitly instructed by the user. Leave completed changes uncommitted otherwise.

## User-Facing Copy

The target audience is German-speaking. Write plain, concise German that helps users act, understand a result, make a choice, or recover from an error. Avoid rhymes, poetic phrasing, and decorative slogans. Do not add text that provides no practical value. For example, avoid “Ein Muster, das weiterläuft.”

## Security and Deployment

All editing and exports run in the browser. Keep uploaded SVG sanitization and file-size checks in place; do not add secrets or server dependencies. GitHub Pages deploys from `master`; preserve `public/CNAME` and verify the production build before changing deployment settings.
