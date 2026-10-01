import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const output = '/tmp/banderole-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173/');
  await page.locator('.upper-canvas').waitFor();
  const exports = await page.evaluate(async () => {
    const { banderoleSvg, banderolePdf } = await import('/src/studio/banderoleExport.ts');
    const { makePackagingDocument } = await import('/src/studio/packagingTemplates.ts');
    const { addPackagingText } = await import('/src/studio/PackagingCanvas.tsx');
    const { symbolData } = await import('/src/studio/symbols.ts');
    const { useStudio } = await import('/src/studio/store.ts');
    const doc = makePackagingDocument('banderole'),
      p = doc.pages[0];
    p.bleedMm = 5;
    p.background = '#ffeedd';
    p.layers = ['Liberation Sans', 'Liberation Serif', 'Liberation Mono'].flatMap((fontFamily, i) =>
      [0, 1, 2, 3].map((style, j) => ({
        ...addPackagingText(doc),
        name: `${fontFamily} ${style}`,
        fontFamily,
        bold: !!(style & 1),
        italic: !!(style & 2),
        fontSizePt: 7,
        widthMm: 42,
        xMm: 37 + j * 58,
        yMm: 19 + i * 12,
        rotation: i === 1 ? 5 : 0,
        text: 'ÄÖÜ ß & Größe\nZweite Zeile',
      })),
    );
    p.layers.push({
      ...addPackagingText(doc),
      type: 'image',
      name: 'Vektorlogo',
      dataUrl: symbolData('♡'),
      widthMm: 7,
      heightMm: 7,
      xMm: 238,
      yMm: 50,
    });
    const options = { cutMarks: true, dieLines: true, innerGuides: true, textMode: 'text' };
    const text = await banderoleSvg(doc, options),
      paths = await banderoleSvg(doc, { ...options, textMode: 'paths' });
    const pdf = await banderolePdf(doc, options),
      pdfPaths = await banderolePdf(doc, { ...options, textMode: 'paths' });
    const xml = new DOMParser().parseFromString(text.svg, 'image/svg+xml');
    const groups = [...xml.documentElement.children]
      .filter((el) => el.localName === 'g')
      .map((el) => el.getAttribute('inkscape:label'));
    if (xml.querySelector('parsererror')) throw new Error('Invalid SVG');
    const raster = document.createElement('canvas');
    raster.width = 10;
    raster.height = 10;
    raster.getContext('2d').fillRect(0, 0, 10, 10);
    p.layers.push({
      ...addPackagingText(doc),
      type: 'image',
      name: 'Raster',
      dataUrl: raster.toDataURL(),
      widthMm: 5,
      heightMm: 5,
      xMm: 20,
      yMm: 50,
    });
    const mixed = await banderoleSvg(doc, options),
      mixedPdf = await banderolePdf(doc, options);
    p.layers.push({
      ...addPackagingText(doc),
      type: 'image',
      name: 'Unzulässiger Effekt',
      dataUrl:
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><filter id="f"><feGaussianBlur stdDeviation="2"/></filter><rect filter="url(#f)" width="10" height="10"/></svg>',
        ),
    });
    let rejection = '';
    try {
      await banderoleSvg(doc, options);
    } catch (error) {
      rejection = error.message;
    }
    p.layers.pop();
    useStudio.getState().update((project) => ({
      ...project,
      packagingDocuments: { ...project.packagingDocuments, banderole: doc },
    }));
    return {
      svg: text.svg,
      paths: paths.svg,
      mixed: mixed.svg,
      pdf: Array.from(new Uint8Array(pdf.output('arraybuffer'))),
      pdfPaths: Array.from(new Uint8Array(pdfPaths.output('arraybuffer'))),
      mixedPdf: Array.from(new Uint8Array(mixedPdf.output('arraybuffer'))),
      groups,
      rejection,
    };
  });
  console.log('Export structure checks');
  assert.deepEqual(exports.groups, ['Hintergrund', 'Gestaltung', 'Markierungen']);
  assert.ok(exports.rejection.includes('Unzulässiger Effekt'));
  assert.equal((exports.svg.match(/<image\b/g) || []).length, 0);
  assert.equal((exports.mixed.match(/<image\b/g) || []).length, 1);
  assert.ok(!exports.paths.includes('<text'));
  assert.ok(exports.svg.includes('<text'));
  for (const [name, data] of [
    ['text.svg', exports.svg],
    ['paths.svg', exports.paths],
    ['mixed.svg', exports.mixed],
    ['text.pdf', Buffer.from(exports.pdf)],
    ['paths.pdf', Buffer.from(exports.pdfPaths)],
    ['mixed.pdf', Buffer.from(exports.mixedPdf)],
  ])
    await writeFile(`${output}/${name}`, data);
  const pdf = Buffer.from(exports.pdf).toString('latin1');
  assert.ok(pdf.includes('/TrimBox'));
  assert.ok(pdf.includes('/BleedBox'));
  assert.equal((pdf.match(/\/Subtype\s*\/Image/g) || []).length, 0);
  assert.equal((pdf.match(/\/FontFile2\b/g) || []).length, 12);
  assert.equal(
    (
      Buffer.from(exports.pdfPaths)
        .toString('latin1')
        .match(/\/Subtype\s*\/Image/g) || []
    ).length,
    0,
  );
  assert.equal(
    (
      Buffer.from(exports.mixedPdf)
        .toString('latin1')
        .match(/\/Subtype\s*\/Image/g) || []
    ).length,
    1,
  );
  for (const [tag, expected] of [
    ['TrimBox', [10.001, 9.7915, 245.001, 56.7915]],
    ['BleedBox', [5.001, 4.7915, 250.001, 61.7915]],
  ]) {
    const coords = pdf
      .match(new RegExp(`/${tag} \\[([^\\]]+)\\]`))[1]
      .trim()
      .split(/\s+/)
      .map(Number);
    coords.forEach((value, i) => assert.ok(Math.abs((value * 25.4) / 72 - expected[i]) < 0.00001));
  }
  const textCheck = await page.evaluate(async (bytes) => {
    const { getDocument, GlobalWorkerOptions } =
      await import('/node_modules/pdfjs-dist/build/pdf.mjs');
    GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';
    const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise;
    const p = await pdf.getPage(1),
      text = await p.getTextContent();
    const strings = text.items.map((item) => item.str || '').join(' ');
    const canvas = document.createElement('canvas'),
      viewport = p.getViewport({ scale: 2 });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await p.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
    const png = canvas.toDataURL().split(',')[1];
    await pdf.destroy();
    return { strings, png };
  }, exports.pdf);
  assert.ok(textCheck.strings.includes('ÄÖÜ ß & Größe'));
  assert.ok(textCheck.strings.includes('Zweite Zeile'));
  await writeFile(`${output}/pdf.png`, Buffer.from(textCheck.png, 'base64'));
  const compareScene = async () =>
    page.evaluate(async () => {
      const { useStudio } = await import('/src/studio/store.ts');
      const { banderoleSvg } = await import('/src/studio/banderoleExport.ts');
      const doc = useStudio.getState().project.packagingDocuments.banderole;
      const { svg } = await banderoleSvg(doc, {
        cutMarks: false,
        dieLines: false,
        innerGuides: false,
        textMode: 'text',
      });
      const image = new Image();
      image.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      await image.decode();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const actual = document.querySelector('.lower-canvas'),
        host = document.querySelector('.packCanvasHost');
      const scale = +host.dataset.scale,
        x = +host.dataset.offsetX,
        y = +host.dataset.offsetY;
      const expected = document.createElement('canvas');
      expected.width = actual.width;
      expected.height = actual.height;
      const ctx = expected.getContext('2d');
      ctx.drawImage(image, x, y, 255.002 * scale, 66.583 * scale);
      URL.revokeObjectURL(image.src);
      const a = actual.getContext('2d').getImageData(0, 0, actual.width, actual.height).data,
        b = ctx.getImageData(0, 0, actual.width, actual.height).data;
      const bleed = doc.pages[0].bleedMm ?? 3;
      let diff = 0,
        count = 0;
      for (
        let py = Math.max(1, Math.ceil(y + (9.7915 - bleed) * scale) + 2);
        py < Math.min(actual.height - 1, y + (56.7915 + bleed) * scale - 2);
        py++
      )
        for (
          let px = Math.max(1, Math.ceil(x + (10.001 - bleed) * scale) + 2);
          px < Math.min(actual.width - 1, x + (245.001 + bleed) * scale - 2);
          px++
        ) {
          const offset = (py * actual.width + px) * 4;
          // Fabric caches text into bitmaps; SVG uses different subpixel antialiasing.
          // Compare a one-pixel neighborhood without tolerating displaced geometry.
          for (let c = 0; c < 3; c++) {
            let sumA = 0,
              sumB = 0;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const i = offset + (dy * actual.width + dx) * 4 + c;
                sumA += a[i];
                sumB += b[i];
              }
            diff += Math.abs(sumA - sumB) / 9;
          }
          count += 3;
        }
      globalThis.sceneComparison = { actual: actual.toDataURL(), expected: expected.toDataURL() };
      return diff / count;
    });
  const pathDifference = await page.evaluate(async ({ svg, paths }) => {
    const pixels = async (source) => {
      const image = new Image();
      image.src = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 2040;
      canvas.height = 533;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 2040, 533);
      ctx.drawImage(image, 0, 0, 2040, 533);
      URL.revokeObjectURL(image.src);
      return ctx.getImageData(0, 0, 2040, 533).data;
    };
    const a = await pixels(svg),
      b = await pixels(paths);
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
    return diff / a.length;
  }, exports);
  console.log('Text/path pixel difference:', pathDifference);
  assert.ok(pathDifference < 1.5, 'Text and paths must preserve the same layout');
  const pdfDifference = await page.evaluate(
    async ({ svg, png }) => {
      const image = async (source) => {
        const result = new Image();
        result.src = source;
        await result.decode();
        return result;
      };
      const pdfImage = await image('data:image/png;base64,' + png),
        svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })),
        svgImage = await image(svgUrl);
      const pixels = (img, w, h) => {
        const canvas = document.createElement('canvas');
        canvas.width = pdfImage.width;
        canvas.height = pdfImage.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, w, h);
        return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const a = pixels(pdfImage, pdfImage.width, pdfImage.height),
        b = pixels(svgImage, ((255.002 * 72) / 25.4) * 2, ((66.583 * 72) / 25.4) * 2);
      URL.revokeObjectURL(svgUrl);
      let error = 0;
      for (let i = 0; i < a.length; i++) error += Math.abs(a[i] - b[i]);
      return error / a.length;
    },
    { svg: exports.svg, png: textCheck.png },
  );
  console.log('PDF/SVG pixel difference:', pdfDifference);
  assert.ok(pdfDifference < 1.5, 'PDF and SVG must preserve the same scene');
  console.log('UI checks');
  await page.getByRole('button', { name: 'Verpackungen', exact: true }).click();
  await page.locator('.packMarks line').first().waitFor({ state: 'attached' });
  console.log('Editor/export pixel difference:', await compareScene());
  assert.ok((await compareScene()) < 1.5, 'Editor and SVG must match');
  assert.equal(await page.locator('.packMarks line').count(), 15);
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  const zoomDifference = await compareScene();
  console.log('Zoom pixel difference:', zoomDifference);
  if (zoomDifference >= 1.5) {
    const images = await page.evaluate(() => globalThis.sceneComparison);
    for (const [name, data] of Object.entries(images))
      await writeFile(`${output}/zoom-${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
  }
  assert.ok(zoomDifference < 1.5, 'Zoom must preserve the exported scene');
  await page.getByRole('button', { name: 'Verpackung einpassen', exact: true }).click();
  await page.getByLabel('Schnittmarken', { exact: true }).uncheck();
  assert.equal(await page.locator('.packMarks line').count(), 7);
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  assert.equal(await page.locator('.packMarks line').count(), 15);
  await page.getByLabel('Beschnitt (mm)', { exact: true }).selectOption('0');
  await page.getByLabel('Hintergrundfarbe', { exact: true }).fill('#abccdd');
  await page.getByLabel('Hintergrundbild der Banderole hochladen').setInputFiles({
    name: 'back.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20mm" height="10mm"><rect width="100%" height="100%" fill="pink"/></svg>',
    ),
  });
  await page.getByRole('button', { name: 'Bild bearbeiten', exact: true }).click();
  await page.getByRole('button', { name: 'Bild sperren', exact: true }).waitFor();
  const rotation = page.getByRole('textbox', { name: 'Drehung', exact: true });
  await rotation.fill('15');
  await rotation.blur();
  const width = page.getByRole('textbox', { name: 'Breite', exact: true });
  await width.fill('30');
  await width.blur();
  assert.ok((await compareScene()) < 1.5, 'Transformed background and export must match');
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  await page.getByRole('button', { name: 'Wiederholen', exact: true }).click();
  console.log('UI export preview');
  await page.getByRole('button', { name: 'Exportieren', exact: true }).click();
  await page.getByAltText('Vorschau der Banderole mit gewählten Druckmarken').waitFor();
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Banderole als SVG' }).click(),
  ]).then(([d]) => d);
  assert.ok((await readFile(await download.path(), 'utf8')).includes('back.svg'));
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.screenshot({ path: `${output}/desktop.png` });
  const state = () =>
    page.evaluate(
      async () =>
        (await import('/src/studio/store.ts')).useStudio.getState().project.packagingDocuments
          .banderole,
    );
  const saved = await state();
  await page.reload();
  await page.locator('.upper-canvas').waitFor();
  assert.deepEqual(await state(), saved);
  await page.getByRole('button', { name: 'Verpackungen', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Verpackung einpassen', exact: true }).click();
  assert.ok((await compareScene()) < 1.5, 'Narrow-screen editor and export must match');
  await page.screenshot({ path: `${output}/mobile.png` });
  await page.getByRole('button', { name: 'Werkzeuge', exact: true }).click();
  await page.getByRole('button', { name: 'Bild entfernen', exact: true }).click();
  assert.ok(!(await state()).pages[0].layers.some((layer) => layer.role === 'background'));
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  assert.ok((await state()).pages[0].layers.some((layer) => layer.role === 'background'));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  // Round-trip both delivery formats using the installed Inkscape CLI.
  for (const name of ['text', 'paths', 'mixed']) {
    execFileSync(
      'inkscape',
      [
        `${output}/${name}.svg`,
        '--export-type=svg',
        `--export-filename=${output}/${name}-saved.svg`,
      ],
      { stdio: 'pipe', maxBuffer: 32 * 1024 * 1024 },
    );
    const savedSvg = await readFile(`${output}/${name}-saved.svg`, 'utf8');
    assert.ok(savedSvg.includes('inkscape:label="Hintergrund"'));
    assert.ok(savedSvg.includes('inkscape:label="Markierungen"'));
    if (name === 'paths') assert.ok(!/<(?:svg:)?text\b/.test(savedSvg));
    execFileSync(
      'inkscape',
      [
        `${output}/${name}.pdf`,
        '--export-type=svg',
        `--export-filename=${output}/${name}-pdf-saved.svg`,
      ],
      { stdio: 'pipe', maxBuffer: 32 * 1024 * 1024 },
    );
    const fromPdf = await readFile(`${output}/${name}-pdf-saved.svg`, 'utf8');
    if (name !== 'mixed') assert.ok(!/<(?:svg:)?image\b/.test(fromPdf));
    assert.ok(/<(?:svg:)?path\b/.test(fromPdf));
    execFileSync(
      'inkscape',
      [
        `${output}/${name}.pdf`,
        '--export-type=pdf',
        `--export-filename=${output}/${name}-saved.pdf`,
      ],
      { stdio: 'pipe', maxBuffer: 32 * 1024 * 1024 },
    );
    const resavedPdf = (await readFile(`${output}/${name}-saved.pdf`)).toString('latin1');
    assert.ok(resavedPdf.startsWith('%PDF-'));
    if (name !== 'mixed') assert.equal((resavedPdf.match(/\/Subtype\s*\/Image/g) || []).length, 0);
    else assert.ok((fromPdf.match(/<(?:svg:)?image\b/g) || []).length === 1);
  }
  console.log(`Banderole export, UI and Inkscape checks passed: ${output}`);
} finally {
  await browser.close();
}
