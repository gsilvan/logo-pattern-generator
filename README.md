# Bergtuch Musterstudio

Browser-based editor for seamless beeswax-wrap patterns and their packaging.

## Development

Node 20.19+ is required.

```sh
npm ci
npm run dev
npm test
npm run build
```

The project uses React, TypeScript, Vite, Fabric.js for direct object editing, PixiJS for the continuous pattern surface, IndexedDB for autosave, and browser-generated PNG/PDF/ZIP files. No server is required.

## Editor controls

The pattern fills the workspace; the right sidebar contains dimensions, layers and motif properties. The sheet outline shows the exported area in centimetres. Kachelgrenzen and Tuchrahmen can be toggled in the Ansicht menu.

- Drag any visible repetition to edit its motif. Shift-click selects additional motifs; groups can be moved, scaled and rotated together.
- Use the mouse wheel to zoom around the pointer. Hold Space and drag, use the middle mouse button, or select the hand tool to pan. Touch supports panning and pinch zoom.
- Tuch einpassen fits the sheet; Ansicht also offers tile fitting and screen calibration for approximate physical size.
- Ctrl/Cmd+Z undoes a change; Ctrl/Cmd+Shift+Z redoes it. Escape cancels a running transformation. Delete removes selected unlocked motifs.
- Projekt contains New/Open/Save. Exportieren opens the existing PNG/PDF export options. On narrow screens, Werkzeuge opens the sidebar.

One completed transformation creates one undo step. Camera settings and guides are view-only and never affect saved projects or print output.

For browser checks, start the development server, then run `npm run test:browser`. Set `CHROMIUM_PATH` if Chromium is not installed at `/usr/bin/chromium`. The checks cover repeated editing, groups, exports, project files, touch, responsive layout and rendering without WebGL/WebGPU.

## Print output

Sheet size is entered in centimetres, held internally in millimetres, and exported at 300 pixels per inch. PNG files carry `pHYs` resolution metadata. PDF page dimensions are set in millimetres. RGB artwork is supplied to the printer; the printer handles any required colour conversion.

The repeat tile is an explicit part of the project. Objects may cross its edges and rotate freely. Exported sheets are made from that tile. The guided grid sets its own full repeat period when it arranges motifs.

## Deployment

The GitHub Pages workflow builds the static Vite output on `master`; `public/CNAME` retains musterersteller.de. A repository-subpath deployment can set `VITE_BASE=/repo-name/` during build.
