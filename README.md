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

The project uses React, TypeScript, Vite, Fabric.js for direct object editing, PixiJS for the repeated sheet preview, IndexedDB for autosave, and browser-generated PNG/PDF/ZIP files. No server is required.

## Print output

Sheet size is entered in centimetres, held internally in millimetres, and exported at 300 pixels per inch. PNG files carry `pHYs` resolution metadata. PDF page dimensions are set in millimetres. RGB artwork is supplied to the printer; the printer handles any required colour conversion.

The repeat tile is an explicit part of the project. Objects may cross its edges and rotate freely. Exported sheets are made from that tile. The guided grid sets its own full repeat period when it arranges motifs.

## Deployment

The GitHub Pages workflow builds the static Vite output on `master`; `public/CNAME` retains musterersteller.de. A repository-subpath deployment can set `VITE_BASE=/repo-name/` during build.
