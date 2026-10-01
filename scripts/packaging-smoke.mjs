import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
const output = '/tmp/packaging-check';
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const paint = () =>
    page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  const state = () =>
    page.evaluate(async () => {
      const { useStudio } = await import('/src/studio/store.ts');
      const { project, draft, past } = useStudio.getState();
      return { project, draft, past: past.length };
    });
  const camera = () =>
    page.locator('.packCanvasHost').evaluate((el) => ({
      scale: +el.dataset.scale,
      x: +el.dataset.offsetX,
      y: +el.dataset.offsetY,
    }));
  const point = (x, y) =>
    page.locator('.packCanvasHost').evaluate(
      (el, p) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.x + +el.dataset.offsetX + p.x * +el.dataset.scale,
          y: r.y + +el.dataset.offsetY + p.y * +el.dataset.scale,
        };
      },
      { x, y },
    );
  const pixels = () => page.locator('.lower-canvas').evaluate((el) => el.toDataURL());
  const select = (name) => page.locator('.layerName').filter({ hasText: name }).click();
  const layer = async () => (await state()).project.packagingDocuments.banderole.pages[0].layers[0];
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173/');
  await page.locator('.upper-canvas').waitFor();
  await page.getByRole('button', { name: 'Verpackungen', exact: true }).click();
  await page.getByRole('button', { name: '+ Text hinzufügen', exact: true }).click();
  await paint();
  const text = page.getByRole('textbox', { name: 'Inhalt', exact: true });
  const before = await state(),
    beforePixels = await pixels();
  await text.fill('Änderung rechts\nZweite Zeile');
  await text.press('End');
  await text.pressSequentially(' mit Leerzeichen');
  await paint();
  assert.equal(await text.evaluate((el) => document.activeElement === el), true);
  assert.equal((await state()).past, before.past, 'Typing must stay in one edit transaction');
  assert.notEqual(await pixels(), beforePixels, 'Sidebar text must update the canvas live');
  await text.blur();
  const changed = await layer();
  assert.equal(changed.text, 'Änderung rechts\nZweite Zeile mit Leerzeichen');
  assert.equal((await state()).past, before.past + 1);
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  assert.equal((await layer()).text, 'Doppelklick zum Bearbeiten');
  await page.getByRole('button', { name: 'Wiederholen', exact: true }).click();
  assert.equal((await layer()).text, changed.text);

  // Each keystroke updates the draft without ending Fabric's editing session.
  let p = await point(changed.xMm, changed.yMm);
  await page.mouse.dblclick(p.x, p.y);
  const fabricText = page.locator('textarea[data-fabric="textarea"]');
  await fabricText.waitFor({ state: 'attached' });
  const editingPast = (await state()).past;
  await page.keyboard.press('Control+a');
  const directText = 'Direkter Text\nÄÖÜ ß';
  for (const [index, char] of [...directText].entries()) {
    if (char === '\n') await page.keyboard.press('Enter');
    else await page.keyboard.insertText(char);
    await paint();
    assert.equal(await fabricText.count(), 1, `Fabric editor closed after character ${index + 1}`);
    assert.equal(await fabricText.evaluate((el) => document.activeElement === el), true);
    assert.equal(
      (await state()).draft?.packagingDocuments?.banderole?.pages[0].layers[0].text,
      directText.slice(0, index + 1),
    );
    assert.equal((await state()).past, editingPast);
  }
  await text.click();
  await text.blur();
  assert.equal((await layer()).text, directText);
  assert.equal((await state()).past, editingPast + 1);
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  assert.equal((await layer()).text, changed.text);
  await page.getByRole('button', { name: 'Wiederholen', exact: true }).click();
  assert.equal((await layer()).text, directText);
  const nameBounds = await page.getByRole('textbox', { name: 'Ebenenname' }).boundingBox();
  const contentBounds = await text.boundingBox();
  assert.ok(Math.abs(contentBounds.x - nameBounds.x) < 1);
  assert.ok(Math.abs(contentBounds.width - nameBounds.width) < 1);
  assert.ok(contentBounds.y > nameBounds.y + nameBounds.height);
  assert.deepEqual(
    await text.evaluate((el) => {
      const style = getComputedStyle(el);
      return [style.backgroundColor, style.color, style.display];
    }),
    ['rgb(255, 255, 255)', 'rgb(39, 48, 61)', 'block'],
  );
  await text.fill('Danach rechts\nÄÖÜ ß');
  await text.blur();
  await paint();
  assert.equal((await layer()).text, 'Danach rechts\nÄÖÜ ß');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Werkzeuge', exact: true }).click();
  const narrowContent = await text.boundingBox();
  const narrowSidebar = await page.locator('.sidebar').boundingBox();
  assert.ok(narrowContent && narrowSidebar);
  assert.ok(narrowContent.x >= narrowSidebar.x);
  assert.ok(narrowContent.x + narrowContent.width <= narrowSidebar.x + narrowSidebar.width);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  const zoomed = await camera();
  await page.setViewportSize({ width: 1200, height: 800 });
  await paint();
  assert.deepEqual(await camera(), zoomed, 'Resize must preserve camera');
  const modelBeforePan = (await state()).project;
  await page.getByRole('button', { name: 'Ansicht verschieben', exact: true }).click();
  p = await point(120, 30);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 40, p.y + 20, { steps: 5 });
  await page.mouse.up();
  assert.ok(Math.abs((await camera()).x - zoomed.x - 40) < 1);
  assert.deepEqual((await state()).project, modelBeforePan, 'Panning must not edit document');
  const beforeWheel = await camera();
  const bounds = await page.locator('.packCanvasHost').boundingBox();
  const mouse = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  await page.mouse.move(mouse.x, mouse.y);
  await page.mouse.wheel(0, -140);
  await paint();
  const afterWheel = await camera();
  assert.ok(afterWheel.scale > beforeWheel.scale);
  assert.ok(
    Math.abs(
      (bounds.width / 2 - beforeWheel.x) / beforeWheel.scale -
        (bounds.width / 2 - afterWheel.x) / afterWheel.scale,
    ) < 0.01,
  );
  await page.getByRole('button', { name: 'Muster', exact: true }).click();
  await page.getByRole('button', { name: 'Verpackungen', exact: true }).click();
  assert.deepEqual(await camera(), afterWheel);
  await page.locator('.viewMenu summary').click();
  await page.getByRole('button', { name: 'Bildschirm kalibrieren', exact: true }).click();
  await page.getByRole('textbox', { name: 'Gemessene Länge (cm)' }).fill('4');
  await page.getByRole('button', { name: 'Originalgröße anzeigen', exact: true }).click();
  assert.ok(Math.abs((await camera()).scale - (96 / 25.4) * 1.25) < 0.001);
  await page.getByRole('button', { name: 'Muster', exact: true }).click();
  await page.locator('.viewMenu summary').click();
  await page.getByRole('button', { name: 'Ungefähre Originalgröße', exact: true }).click();
  const patternScale = await page.locator('.canvasViewport').getAttribute('data-scale');
  assert.ok(Math.abs(+patternScale - (96 / 25.4) * 1.25) < 0.001);
  await page.getByRole('button', { name: 'Verpackungen', exact: true }).click();
  await page.getByRole('button', { name: 'Verpackung einpassen', exact: true }).click();
  await page.getByRole('button', { name: 'Auswählen', exact: true }).click();
  await select('Neuer Text');
  let old = await layer();
  p = await point(old.xMm, old.yMm);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 20, p.y + 10, { steps: 5 });
  await page.mouse.up();
  await paint();
  assert.ok(Math.abs((await layer()).xMm - old.xMm - 20 / (await camera()).scale) < 0.2);
  assert.equal((await layer()).text, old.text);
  await page.getByRole('button', { name: '+ Text hinzufügen', exact: true }).click();
  await page
    .locator('.layerName')
    .last()
    .click({ modifiers: ['Shift'] });
  assert.equal(await page.locator('.layerName[aria-pressed=true]').count(), 2);
  // Move the group from the second text's center and verify both model positions.
  let layers = (await state()).project.packagingDocuments.banderole.pages[0].layers;
  p = await point(layers[1].xMm, layers[1].yMm);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 30, p.y, { steps: 5 });
  await page.mouse.up();
  await paint();
  let moved = (await state()).project.packagingDocuments.banderole.pages[0].layers;
  for (let i = 0; i < 2; i++)
    assert.ok(
      Math.abs(moved[i].xMm - layers[i].xMm - 30 / (await camera()).scale) < 0.3,
      'Group must move all selected layers',
    );
  await page.locator('.layerName').last().click();
  old = await layer();
  p = await point(old.xMm + old.widthMm / 2, old.yMm + old.heightMm / 2);
  await page.mouse.move(p.x + 2, p.y + 2);
  await page.mouse.down();
  await page.mouse.move(p.x + 42, p.y + 22, { steps: 8 });
  await page.mouse.up();
  await paint();
  const scaled = await layer();
  assert.deepEqual(
    (await state()).project.packagingDocuments.banderole.pages[0].layers[1],
    moved[1],
    'Editing one layer must not rewrite other layers',
  );
  assert.ok(scaled.fontSizePt > old.fontSizePt * 1.05, 'Corner scaling must update the font size');
  await page.locator('.packToolbar').click();
  await page.locator('.layerName').first().click();
  await page.locator('.layerName').last().click();
  await paint();
  assert.deepEqual(await layer(), scaled, 'Reselecting must not change text geometry');
  await page.screenshot({ path: `${output}/editing.png` });
  const savedPackaging = (await state()).project.packagingDocuments;
  await page.reload();
  await page.locator('.upper-canvas').waitFor();
  assert.deepEqual(
    (await state()).project.packagingDocuments,
    savedPackaging,
    'Reload must preserve text and transforms',
  );
  assert.equal(
    (await state()).project.packagingDocuments.banderole.pages[0].layers[0].text,
    'Danach rechts\nÄÖÜ ß',
  );
  await page.getByRole('button', { name: 'Verpackungen', exact: true }).click();

  // Validate every example's real rendered text dimensions, not estimates.
  const examples = await page.evaluate(async () => {
    const { packagingTypes, makePackagingDocument } =
      await import('/src/studio/packagingTemplates.ts');
    const { Textbox } = await import('/node_modules/fabric/dist/index.min.mjs');
    const problems = [];
    for (const type of packagingTypes)
      for (let i = 0; i < type.examples.length; i++) {
        const doc = makePackagingDocument(type.kind, i);
        for (const page of doc.pages)
          for (const layer of page.layers) {
            const text = new Textbox(layer.text, {
              width: layer.widthMm,
              fontFamily: layer.fontFamily,
              fontSize: (layer.fontSizePt * 25.4) / 72,
              fontWeight: layer.bold ? 'bold' : 'normal',
            });
            if (text.height > layer.heightMm + 0.5)
              problems.push(
                `${type.kind}/${i}/${page.face}/${layer.name}: ${text.height.toFixed(1)} > ${layer.heightMm}`,
              );
            if (
              layer.xMm - layer.widthMm / 2 < 0 ||
              layer.xMm + layer.widthMm / 2 > page.widthMm ||
              layer.yMm - text.height / 2 < 0 ||
              layer.yMm + text.height / 2 > page.heightMm
            )
              problems.push(`Outside page: ${layer.name}`);
            text.dispose();
          }
      }
    return { problems, types: packagingTypes };
  });
  assert.deepEqual(examples.problems, [], 'Sample text must fit its allocated panel space');
  for (const type of examples.types) {
    await page.getByRole('combobox', { name: 'Verpackungsart' }).selectOption(type.kind);
    for (const name of type.examples) {
      await page.getByRole('button', { name: 'Beispiel laden', exact: true }).click();
      await page
        .getByRole('dialog', { name: 'Beispiel laden' })
        .getByRole('button', { name, exact: true })
        .click();
      const doc = (await state()).project.packagingDocuments[type.kind];
      for (let index = 0; index < doc.pages.length; index++) {
        if (type.kind === 'carton')
          await page
            .getByRole('combobox', { name: 'Faltschachtelseite' })
            .selectOption(String(index));
        await page.getByRole('button', { name: 'Verpackung einpassen', exact: true }).click();
        await paint();
        await page.screenshot({ path: `${output}/${doc.templateId}-${index}.png` });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByRole('button', { name: 'Verpackung einpassen', exact: true }).click();
        await paint();
        await page.screenshot({ path: `${output}/${doc.templateId}-${index}-mobile.png` });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.setViewportSize({ width: 1200, height: 800 });
      }
    }
    await page.getByRole('button', { name: 'Exportieren', exact: true }).click();
    const downloaded = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Verpackung als PDF', exact: true }).click(),
    ]).then(([download]) => download);
    const bytes = await readFile(await downloaded.path());
    const pdf = bytes.toString('latin1');
    const doc = (await state()).project.packagingDocuments[type.kind];
    const media = [...pdf.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
    assert.equal(media.length, doc.pages.length);
    for (const [i, box] of media.entries()) {
      assert.ok(Math.abs((+box[1] * 25.4) / 72 - doc.pages[i].widthMm) < 0.01);
      assert.ok(Math.abs((+box[2] * 25.4) / 72 - doc.pages[i].heightMm) < 0.01);
    }
    const rendered = await page.evaluate(
      async (bytes) => {
        const { getDocument, GlobalWorkerOptions } =
          await import('/node_modules/pdfjs-dist/build/pdf.mjs');
        GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';
        const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise;
        const result = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i),
            viewport = page.getViewport({ scale: 1 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
          const content = await page.getTextContent();
          result.push({
            image: canvas.toDataURL('image/png').split(',')[1],
            texts: content.items
              .filter((item) => item.str?.trim())
              .map((item) => ({
                text: item.str,
                x: item.transform[4],
                y: viewport.height - item.transform[5],
                width: item.width,
                rotation: (Math.atan2(-item.transform[1], item.transform[0]) * 180) / Math.PI,
              })),
            width: viewport.width,
            height: viewport.height,
          });
        }
        await pdf.destroy();
        return result;
      },
      [...bytes],
    );
    for (const [i, renderedPage] of rendered.entries()) {
      await writeFile(
        `${output}/${type.kind}-export-${i}.png`,
        Buffer.from(renderedPage.image, 'base64'),
      );
      for (const text of renderedPage.texts) {
        assert.ok(
          text.x >= 0 &&
            text.x <= renderedPage.width &&
            text.y >= 0 &&
            text.y <= renderedPage.height,
          `Exported text outside page: ${text.text}`,
        );
      }
      for (const layer of doc.pages[i].layers.filter((layer) => layer.rotation === 180)) {
        const firstLine = layer.text.split('\n')[0];
        const found = renderedPage.texts.find((item) => firstLine.startsWith(item.text));
        assert.ok(
          found && Math.abs(Math.abs(found.rotation) - 180) < 0.1,
          `Missing rotated PDF text: ${firstLine}`,
        );
        assert.ok(
          Math.abs((found.x * 25.4) / 72 - (layer.xMm + layer.widthMm / 2)) < 0.2,
          'PDF must rotate around the same text center as the editor',
        );
      }
    }
    await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await paint();
  await page.screenshot({ path: `${output}/mobile.png` });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log(`Packaging browser checks passed; all example screenshots in ${output}`);
} finally {
  await browser.close();
}
