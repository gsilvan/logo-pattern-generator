import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const output = '/tmp/packaging-vector-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173/');
  await page.locator('.upper-canvas').waitFor();
  const results = await page.evaluate(async () => {
    const { packagingSvg, packagingPdf } = await import('/src/studio/banderoleExport.ts');
    const { makePackagingDocument } = await import('/src/studio/packagingTemplates.ts');
    const { printGeometry } = await import('/src/studio/packagingGeometry.ts');
    const { addPackagingText } = await import('/src/studio/PackagingCanvas.tsx');
    const { symbolData } = await import('/src/studio/symbols.ts');
    const options = { cutMarks: true, dieLines: true, innerGuides: true, textMode: 'text' };
    const answer = [];
    for (const kind of ['envelope', 'rigid', 'carton']) {
      const doc = makePackagingDocument(kind, 0);
      const svg = await packagingSvg(doc, options);
      const paths = await packagingSvg(doc, { ...options, textMode: 'paths' });
      const pdf = await packagingPdf(doc, options);
      const pathsPdf = await packagingPdf(doc, { ...options, textMode: 'paths' });
      answer.push({
        kind,
        svg: svg.svg,
        paths: paths.svg,
        pdf: pdf.output('datauristring').split(',')[1],
        pathsPdf: pathsPdf.output('datauristring').split(',')[1],
        boxes: doc.pages.map((item) => printGeometry(doc, item)),
      });
    }
    const mixedDoc = makePackagingDocument('envelope');
    const logo = addPackagingText(mixedDoc);
    mixedDoc.pages[0].layers.push({
      ...logo,
      type: 'image',
      name: 'Vektorlogo',
      dataUrl: symbolData('♡'),
      widthMm: 12,
      heightMm: 12,
    });
    const raster = document.createElement('canvas');
    raster.width = raster.height = 2;
    raster.getContext('2d').fillRect(0, 0, 2, 2);
    mixedDoc.pages[0].layers.push({
      ...logo,
      id: crypto.randomUUID(),
      type: 'image',
      name: 'Rasterbild',
      dataUrl: raster.toDataURL('image/png'),
      xMm: logo.xMm + 20,
    });
    const mixed = await packagingSvg(mixedDoc, options);
    const mixedPdf = await packagingPdf(mixedDoc, options);
    answer.push({
      kind: 'mixed',
      svg: mixed.svg,
      pdf: mixedPdf.output('datauristring').split(',')[1],
      boxes: [printGeometry(mixedDoc)],
    });
    return answer;
  });
  const collisions = await page.evaluate(async () => {
    const { packagingSvg } = await import('/src/studio/banderoleExport.ts');
    const { packagingTypes, makePackagingDocument } =
      await import('/src/studio/packagingTemplates.ts');
    const serializer = new XMLSerializer();
    const renderMask = async (root, keepId, scale) => {
      const copy = root.cloneNode(true);
      for (const id of ['background', 'artwork', 'marks'])
        if (id !== keepId) copy.querySelector(`#${id}`)?.remove();
      if (keepId === 'marks') copy.querySelectorAll('#marks line').forEach((line) => line.remove());
      const blob = new Blob([serializer.serializeToString(copy)], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(parseFloat(root.getAttribute('width')) * scale);
        canvas.height = Math.ceil(parseFloat(root.getAttribute('height')) * scale);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return context.getImageData(0, 0, canvas.width, canvas.height);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    const findings = [];
    for (const type of packagingTypes.filter((item) => item.kind !== 'banderole'))
      for (let sample = 0; sample < type.examples.length; sample++) {
        const doc = makePackagingDocument(type.kind, sample);
        for (let index = 0; index < doc.pages.length; index++) {
          const { svg } = await packagingSvg(
            doc,
            { cutMarks: false, dieLines: true, innerGuides: true, textMode: 'paths' },
            false,
            index,
          );
          const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
          const scale = 2;
          const art = await renderMask(root, 'artwork', scale);
          const marks = await renderMask(root, 'marks', scale);
          let overlapping = 0;
          let first = '';
          for (let i = 3; i < art.data.length; i += 4)
            if (art.data[i] > 64 && marks.data[i] > 64) {
              overlapping++;
              if (!first)
                first = ` at ${(((i / 4) % art.width) / scale).toFixed(1)},${(Math.floor(i / 4 / art.width) / scale).toFixed(1)}`;
            }
          if (overlapping)
            findings.push(`${type.kind}/${sample}/${index}: ${overlapping} pixels${first}`);
        }
      }
    return findings;
  });
  assert.deepEqual(collisions, [], 'Example text must clear the cut and fold paths');
  const textPathDifferences = await page.evaluate(
    async (items) => {
      const pixels = async (source) => {
        const root = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
        const image = new Image();
        const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
        try {
          image.src = url;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(parseFloat(root.getAttribute('width')) * 3);
          canvas.height = Math.ceil(parseFloat(root.getAttribute('height')) * 3);
          const context = canvas.getContext('2d');
          context.fillStyle = 'white';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          return context.getImageData(0, 0, canvas.width, canvas.height).data;
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      const differences = [];
      for (const item of items) {
        const text = await pixels(item.svg);
        const paths = await pixels(item.paths);
        let sum = 0;
        for (let i = 0; i < text.length; i++) sum += Math.abs(text[i] - paths[i]);
        differences.push({ kind: item.kind, difference: sum / text.length });
      }
      return differences;
    },
    results.filter((item) => item.kind !== 'mixed'),
  );
  for (const { kind, difference } of textPathDifferences)
    assert.ok(difference < 1.5, `${kind}: text and path positions differ by ${difference}`);
  for (const result of results) {
    const { kind, svg, pdf, boxes } = result;
    const pdfBytes = Buffer.from(pdf, 'base64');
    await writeFile(`${output}/${kind}.svg`, svg);
    await writeFile(`${output}/${kind}.pdf`, pdfBytes);
    assert.ok(svg.includes('inkscape:label="Hintergrund"'));
    assert.ok(svg.includes('inkscape:label="Gestaltung"'));
    assert.ok(svg.includes('inkscape:label="Markierungen"'));
    assert.ok(svg.includes('inkscape:label="Stanzkontur"'));
    assert.ok(svg.includes('inkscape:label="Falzlinien"'));
    assert.ok(svg.includes('<path'));
    const xml = pdfBytes.toString('latin1');
    assert.ok(xml.startsWith('%PDF-'));
    assert.equal((xml.match(/\/TrimBox/g) || []).length, boxes.length);
    assert.equal((xml.match(/\/BleedBox/g) || []).length, boxes.length);
    for (const [name, rects] of [
      ['TrimBox', boxes.map((box) => box.trim)],
      ['BleedBox', boxes.map((box) => box.bleed)],
    ]) {
      const actual = [
        ...xml.matchAll(
          new RegExp(
            `/${name}\\s*\\[\\s*([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\s*\\]`,
            'g',
          ),
        ),
      ];
      assert.equal(actual.length, rects.length);
      actual.forEach((match, index) => {
        const rect = rects[index];
        const media = boxes[index].media;
        const expected = [
          rect.x - media.x,
          media.y + media.height - rect.y - rect.height,
          rect.x - media.x + rect.width,
          media.y + media.height - rect.y,
        ].map((value) => (value * 72) / 25.4);
        expected.forEach((value, coordinate) =>
          assert.ok(
            Math.abs(+match[coordinate + 1] - value) < 0.01,
            `${kind} ${name} ${coordinate}`,
          ),
        );
      });
    }
    if (kind !== 'mixed') {
      assert.ok(svg.includes('<text'));
      assert.ok(!svg.includes('<image'));
      assert.equal((xml.match(/\/Subtype\s*\/Image/g) || []).length, 0);
      assert.ok(xml.includes('/FontFile2'));
      assert.ok(result.paths.includes('<path'));
      assert.ok(!result.paths.includes('<text'));
      await writeFile(`${output}/${kind}-paths.svg`, result.paths);
      const pathPdf = Buffer.from(result.pathsPdf, 'base64');
      await writeFile(`${output}/${kind}-paths.pdf`, pathPdf);
      assert.equal((pathPdf.toString('latin1').match(/\/Subtype\s*\/Image/g) || []).length, 0);
    } else {
      assert.equal((svg.match(/<image\b/g) || []).length, 1);
      assert.ok((xml.match(/\/Subtype\s*\/Image/g) || []).length >= 1);
    }
    execFileSync(
      'inkscape',
      [
        `${output}/${kind}.svg`,
        '--export-type=svg',
        `--export-filename=${output}/${kind}-saved.svg`,
      ],
      { stdio: 'pipe', maxBuffer: 32 * 1024 * 1024 },
    );
    const saved = await readFile(`${output}/${kind}-saved.svg`, 'utf8');
    assert.ok(saved.includes('inkscape:label="Hintergrund"'));
    assert.ok(saved.includes('inkscape:label="Markierungen"'));
    execFileSync(
      'inkscape',
      [
        `${output}/${kind}.pdf`,
        '--export-type=svg',
        `--export-filename=${output}/${kind}-pdf-saved.svg`,
      ],
      { stdio: 'pipe', maxBuffer: 32 * 1024 * 1024 },
    );
    const fromPdf = await readFile(`${output}/${kind}-pdf-saved.svg`, 'utf8');
    assert.ok(/<(?:svg:)?path\b/.test(fromPdf));
    if (kind !== 'mixed') assert.ok(!/<(?:svg:)?image\b/.test(fromPdf));
  }
  console.log(`Packaging vector and Inkscape checks passed: ${output}`);
} finally {
  await browser.close();
}
