# Musterersteller

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

One completed transformation creates one undo step. Camera settings and pattern guides are view-only and never affect saved projects or print output. Banderole print-mark selections are saved with the project and copied into the export dialog.

For browser checks, install Inkscape and Liberation fonts, start the development server, then run `npm run test:browser`. `npm run test:packaging` runs the packaging editor, vector export and Inkscape checks. The banderole checks write example PDFs, SVGs, screenshots and Inkscape round trips to `/tmp/banderole-check`. Set `CHROMIUM_PATH` if Chromium is not installed at `/usr/bin/chromium`. The checks cover repeated editing, groups, exports, project files, touch, responsive layout and rendering without WebGL/WebGPU.

## Print output

Sheet size is entered in centimetres, held internally in millimetres, and exported at 300 pixels per inch. PNG files carry `pHYs` resolution metadata. PDF page dimensions are set in millimetres. RGB artwork is supplied to the printer; the printer handles any required colour conversion.

The repeat tile is an explicit part of the project. Objects may cross its edges and rotate freely. Exported sheets are made from that tile. The guided grid sets its own full repeat period when it arranges motifs.

## Banderole vector output

Banderoles use a centered 235 × 47 mm trim on a 255.002 × 66.583 mm page. Bleed defaults to 3 mm and can be set from 0 to 5 mm. Eight 3 mm crop marks sit 1 mm beyond the bleed; crop marks, die contour and internal source-PDF guides can be switched independently. Artwork and backgrounds are clipped to bleed. PDF includes TrimBox and BleedBox metadata.

The export dialog previews the actual output and offers editable text or text converted to paths in PDF and SVG. SVG contains named Inkscape layers, inline vector logos and individual embedded raster images. PDF uses [svg2pdf.js](https://github.com/yWorks/svg2pdf.js); text outlines use opentype.js. Unsupported SVG effects are reported with the layer name rather than flattened. Imported SVG text, filters, masks, patterns and stylesheet rules must be simplified to supported paths before export.

[Liberation Sans, Serif and Mono](https://github.com/liberationfonts/liberation-fonts) are bundled in all four styles under `public/fonts`, alongside the SIL Open Font License. Preview, PDF embedding and outlines use these same TTF files. Existing font names are mapped to the bundled families and the replacement appears in the text controls. Editable SVG also embeds the fonts; external editors that ignore SVG font embedding need the bundled fonts installed. The Inkscape checks use installed Liberation fonts. Illustrator has not been tested.

Background color and an optional background image are saved with the page. Images initially cover trim plus bleed and are locked beneath the design; “Bild bearbeiten” enables movement, scaling and rotation. These changes and print settings support undo, redo, project ZIP files and autosave.

## Deployment

The GitHub Pages workflow builds the static Vite output on `master`; `public/CNAME` retains musterersteller.de. A repository-subpath deployment can set `VITE_BASE=/repo-name/` during build.
