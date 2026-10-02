import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 850 },
    acceptDownloads: true,
  });
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173/');
  await page.locator('.upper-canvas').waitFor();
  await page.evaluate(() => {
    window.queryLocalFonts = async () => {
      throw new Error('denied');
    };
  });
  await page.getByRole('button', { name: 'Verpackungen', exact: true }).click();
  assert.equal(await page.locator('.iconChoices').count(), 0);
  assert.equal(await page.getByLabel('Beschnitt (mm)').count(), 0);
  await page.getByRole('button', { name: 'Text hinzufügen', exact: true }).click();
  await page.getByRole('button', { name: 'Lokale Schriften freigeben' }).click();
  assert.ok(
    await page
      .getByRole('alert')
      .getByText(/Zugriff auf lokale Schriften/)
      .isVisible(),
  );

  await page.evaluate(() => {
    window.queryLocalFonts = async () =>
      Promise.all(
        [
          ['Regular', 'LiberationSerif-Regular.ttf'],
          ['Bold', 'LiberationSerif-Bold.ttf'],
        ].map(async ([style, filename]) => {
          const bytes = await (await fetch(`/fonts/${filename}`)).arrayBuffer();
          return {
            family: 'Kundenfont',
            fullName: `Kundenfont ${style}`,
            postscriptName: `Kundenfont-${style}`,
            style,
            blob: async () => new Blob([bytes], { type: 'font/ttf' }),
          };
        }),
      );
  });
  await page.getByRole('button', { name: 'Lokale Schriften freigeben' }).click();
  await page
    .getByRole('combobox', { name: 'Schrift', exact: true })
    .selectOption('local:Kundenfont');
  const postscriptName = () =>
    page.evaluate(async () => {
      const { useStudio } = await import('/src/studio/store.ts');
      return useStudio.getState().project.packagingDocuments.banderole.pages[0].layers[0]
        .fontPostscriptName;
    });
  await page.waitForFunction(async () => {
    const { useStudio } = await import('/src/studio/store.ts');
    return (
      useStudio.getState().project.packagingDocuments.banderole.pages[0].layers[0]
        .fontPostscriptName === 'Kundenfont-Regular'
    );
  });
  assert.equal(await page.getByRole('button', { name: 'Kursiv', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Fett', exact: true }).click();
  await page.waitForFunction(async () => {
    const { useStudio } = await import('/src/studio/store.ts');
    return (
      useStudio.getState().project.packagingDocuments.banderole.pages[0].layers[0]
        .fontPostscriptName === 'Kundenfont-Bold'
    );
  });
  assert.equal(await postscriptName(), 'Kundenfont-Bold');
  await page.screenshot({ path: '/tmp/local-font-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Werkzeuge', exact: true }).click();
  await page.screenshot({ path: '/tmp/local-font-mobile.png' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1200, height: 850 });
  await page.getByRole('button', { name: 'Exportieren', exact: true }).click();
  assert.equal(await page.getByLabel('Textausgabe').count(), 0);
  const svgDownload = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Banderole als SVG' }).click(),
  ]).then(([download]) => download);
  const svg = await readFile(await svgDownload.path(), 'utf8');
  assert.ok(svg.includes('<path'));
  assert.ok(!svg.includes('<text'));
  const pdfDownload = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Verpackung als PDF' }).click(),
  ]).then(([download]) => download);
  const pdf = (await readFile(await pdfDownload.path())).toString('latin1');
  assert.ok(!pdf.includes('/FontFile2'));
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.reload();
  await page.locator('.upper-canvas').waitFor();
  await page.getByRole('button', { name: 'Verpackungen', exact: true }).click();
  await page.locator('.layerName').filter({ hasText: 'Neuer Text' }).click();
  assert.equal(await postscriptName(), 'Kundenfont-Bold');
  assert.ok(await page.getByText(/Diese Schrift ist noch nicht freigegeben/).isVisible());
  const unavailable = await page.evaluate(async () => {
    const { packagingSvg } = await import('/src/studio/banderoleExport.ts');
    const { useStudio } = await import('/src/studio/store.ts');
    try {
      await packagingSvg(useStudio.getState().project.packagingDocuments.banderole);
      return '';
    } catch (error) {
      return error.message;
    }
  });
  assert.match(unavailable, /Lokale Schriften freigeben/);
  await page
    .getByRole('combobox', { name: 'Schrift', exact: true })
    .selectOption('bundle:Liberation Sans');
  assert.equal(await postscriptName(), undefined);
  console.log('Local font access, real styles, path exports and missing-font checks passed.');
} finally {
  await browser.close();
}
