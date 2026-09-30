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

## Interface Design Specification

The user approved the current interface. Preserve this visual baseline when adding features; change its overall appearance or layout only when explicitly requested. Use `src/studio/style.css` and the existing controls as the reference.

- **Layout:** Fill the browser viewport (`100dvh`). Keep a compact 49 px top bar with the brand, project menu, undo/redo, Muster/Banderole tabs, and Exportieren on the right. Below it, the pattern occupies the remaining space beside a 320 px right sidebar. The workspace has a 41 px view toolbar; a 28 px status bar spans the bottom. Scroll tool panels independently rather than scrolling the entire page.
- **Workspace:** Show one continuous, directly editable pattern. Keep thin, subdued blue-grey tile boundaries and a stronger dark sheet outline with its dimensions in cm. Both guides start visible and can be hidden. The pattern continues outside the sheet outline. Keep selection handles blue and canvas decoration minimal.
- **Tools:** Group sidebar controls with thin separators and compact headings. Place tile and sheet dimensions first, then upload and the visible layer list. Layer rows have small thumbnails, names, and compact action buttons; selected rows use pale blue. Show motif properties for the selection. Keep background and automatic arrangement in collapsible sections. Use compact dialogs for export and confirmation.
- **Palette:** White top/status bars and inputs; `#f9fafb` tool panels; `#eef0f3` application background; `#27303d` text; `#687382` secondary text; `#dce0e5` separators. Use `#245cc5` for primary actions, pale blue `#e8effc` for selection, and a visible blue keyboard focus outline. The pattern background is document content and remains user-controlled.
- **Typography and spacing:** Use the system sans-serif stack with a 13 px base, 11–12 px labels and compact section headings. Standard controls have 1 px borders, approximately 30 px height, and 3 px corner radii. Arrange numeric fields in two columns with adjacent units. Reserve subtle shadows for floating menus, dialogs, and the mobile tool panel.
- **Responsive behavior:** At widths up to 1100 px, reduce the sidebar to 300 px. Below 900 px, show tools in a right overlay opened by Werkzeuge. At widths up to 500 px, wrap the top bar and stack packaging previews. Preserve usable canvas space and prevent horizontal page overflow.
- **Extensions:** Reuse these controls, colours, spacing, and placement for new features. Avoid decorative cards, oversized headings, serif/display fonts, gradients, pill-shaped controls, promotional sections, and ornamental illustrations. Retain concise German labels, accessible control names, and visible focus states. Review desktop and narrow-screen appearance when changing UI.

## Security and Deployment

All editing and exports run in the browser. Keep uploaded SVG sanitization and file-size checks in place; do not add secrets or server dependencies. GitHub Pages deploys from `master`; preserve `public/CNAME` and verify the production build before changing deployment settings.
