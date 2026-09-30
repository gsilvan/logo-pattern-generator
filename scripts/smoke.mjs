import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()), headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const state = () => page.evaluate(async () => { const { useStudio } = await import('/src/studio/store.ts'); const s = useStudio.getState(); return { project: s.project, past: s.past.length, selected: s.selectedIds, draft: s.draft }; });
  const point = (x, y) => page.locator('.canvasViewport').evaluate((el, p) => { const r = el.getBoundingClientRect(); return { x: r.x + Number(el.dataset.offsetX) + p.x * Number(el.dataset.scale), y: r.y + Number(el.dataset.offsetY) + p.y * Number(el.dataset.scale) }; }, { x, y });
  const drag = async (x, y, dx, dy, cancel = false) => { const p = await point(x, y), end = await point(x + dx, y + dy); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 6 }); if (cancel) await page.keyboard.press('Escape'); await page.mouse.up(); };
  const field = async (name, value) => { const input = page.getByRole('textbox', { name, exact: true }); await input.fill(String(value)); await input.blur(); };
  const download = async name => {
    await page.getByRole('button', { name: 'Exportieren', exact: true }).click();
    const result = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name, exact: true }).click()]).then(x => x[0]);
    const bytes = await readFile(await result.path());
    await page.getByRole('button', { name: 'Schließen', exact: true }).click();
    return bytes;
  };
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173/');
  await page.locator('.upper-canvas').waitFor();
  assert.equal(await page.locator('[data-testid=sheet-guide]').count(), 1);
  const artwork = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><path d="M40 360Q-20 0 360 40Q400 400 40 360" fill="#2a8269"/><path d="M40 360L260 140" stroke="#fff" stroke-width="12"/></svg>');
  await page.getByLabel('Motiv hochladen', { exact: true }).setInputFiles({ name: 'Blatt.svg', mimeType: 'image/svg+xml', buffer: artwork });
  await page.getByRole('status').filter({ hasText: 'Fertig.' }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.patternSurface canvas').length === 2);
  const originalTile = await download('Kachel PNG');
  const cameraProject = (await state()).project;
  // Camera changes and guides cannot change export geometry or pixels.
  await page.getByRole('button', { name: 'Ansicht verschieben', exact: true }).click();
  await drag(70, 70, 30, 15);
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  await page.locator('.viewMenu summary').click();
  await page.getByLabel('Tuchrahmen', { exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Kachelgrenzen', exact: true }).uncheck();
  await page.locator('.viewMenu summary').click();
  assert.deepEqual((await state()).project, cameraProject);
  assert.ok(originalTile.equals(await download('Kachel PNG')), 'Camera changed exported tile');
  await page.getByRole('button', { name: 'Auswählen', exact: true }).click();
  await page.getByRole('button', { name: 'Tuch einpassen', exact: true }).click();
  await page.locator('.viewMenu summary').click();
  await page.getByLabel('Tuchrahmen', { exact: true }).check();
  await page.getByRole('checkbox', { name: 'Kachelgrenzen', exact: true }).check();
  await page.getByRole('button', { name: 'Bildschirm kalibrieren', exact: true }).click();
  await page.getByLabel('Gemessene Länge (cm)').fill('4,5');
  await page.getByRole('button', { name: 'Originalgröße anzeigen' }).click();
  await page.locator('.viewMenu summary').click();
  await page.getByRole('button', { name: 'Tuch einpassen', exact: true }).click();
  // Transform a repetition outside the original tile. Only release writes history.
  let before = await state();
  const start = await point(150, 50), end = await point(160, 55);
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 5 });
  let during = await state();
  assert.equal(during.past, before.past); assert.ok(during.draft); assert.deepEqual(during.project, before.project);
  await page.mouse.up();
  let after = await state();
  assert.equal(after.past, before.past + 1); assert.ok(Math.abs(after.project.motifs[0].xMm - 60) < 0.1);
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  assert.deepEqual((await state()).project, before.project);
  await page.getByRole('button', { name: 'Wiederholen', exact: true }).click();
  assert.deepEqual((await state()).project, after.project);
  before = await state(); await drag(160, 55, 12, 5, true);
  assert.deepEqual((await state()).project, before.project); assert.equal((await state()).past, before.past);
  // Crossing the tile edge wraps the logical position without changing dimensions.
  await field('Position X', '9,5'); await field('Position Y', 5);
  before = await state(); await drag(95, 50, 20, 0); after = await state();
  assert.equal(after.past, before.past + 1); assert.ok(Math.abs(after.project.motifs[0].xMm - 15) < 0.1);
  assert.equal(after.project.motifs[0].widthMm, 30);
  // Two logical motifs, selected from repeated copies, form one group.
  await page.getByRole('button', { name: 'Duplizieren', exact: true }).click();
  await field('Position X', 5); await field('Position Y', 6);
  const a = await point(115, 50), b = await point(150, 60);
  await page.mouse.click(a.x, a.y); await page.keyboard.down('Shift'); await page.mouse.click(b.x, b.y); await page.keyboard.up('Shift');
  assert.equal((await state()).selected.length, 2);
  await page.getByRole('button', { name: 'Gruppe bilden', exact: true }).click();
  before = await state(); await drag(115, 50, 8, 6); after = await state();
  assert.equal(after.past, before.past + 1);
  for (let i = 0; i < 2; i++) { assert.ok(Math.abs(after.project.motifs[i].xMm - before.project.motifs[i].xMm - 8) < 0.1); assert.ok(Math.abs(after.project.motifs[i].yMm - before.project.motifs[i].yMm - 6) < 0.1); }
  const group = after.project;
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click(); await page.getByRole('button', { name: 'Wiederholen', exact: true }).click();
  assert.deepEqual((await state()).project, group);
  // Transform handles operate in document coordinates even for a repeated group.
  // The upper-right corner of this group is at (173, 41), with 2 CSS pixels of padding.
  const corner = await point(173, 41), expanded = await point(185, 29);
  await page.mouse.move(corner.x + 2, corner.y - 2); await page.mouse.down(); await page.mouse.move(expanded.x + 2, expanded.y - 2, { steps: 5 }); await page.mouse.up();
  after = await state();
  assert.ok(after.project.motifs.every(m => m.widthMm > 30), 'Group resize did not scale both motifs');
  // Rotate the resized group using Fabric's rotation handle.
  const extents = after.project.motifs.reduce((box, m) => ({ left: Math.min(box.left, m.xMm - m.widthMm / 2), right: Math.max(box.right, m.xMm + m.widthMm / 2), top: Math.min(box.top, m.yMm - m.heightMm / 2) }), { left: Infinity, right: -Infinity, top: Infinity });
  const rotate = await point((extents.left + extents.right) / 2 + 100, extents.top);
  await page.mouse.move(rotate.x, rotate.y - 40); await page.mouse.down(); await page.mouse.move(rotate.x + 50, rotate.y - 10, { steps: 6 }); await page.mouse.up();
  assert.ok((await state()).project.motifs.every(m => Math.abs(m.rotation) > 5), 'Group rotation did not affect both motifs');
  const tile = await download('Kachel PNG'); assert.equal(tile.subarray(1, 4).toString(), 'PNG'); assert.ok(!tile.equals(originalTile));
  const sheet = await download('Tuch PNG');
  assert.equal(sheet.readUInt32BE(16), 2953); assert.equal(sheet.readUInt32BE(20), 2953);
  const resolutionIndex = sheet.indexOf(Buffer.from('pHYs')); assert.ok(resolutionIndex > 0); assert.equal(sheet.readUInt32BE(resolutionIndex + 4), 11811);
  const pdf = await download('Tuch PDF'); assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  const media = pdf.toString('latin1').match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  assert.ok(media && Math.abs(Number(media[1]) - 250 / 25.4 * 72) < 0.2 && Math.abs(Number(media[2]) - 250 / 25.4 * 72) < 0.2);
  const edgePixels = await page.evaluate(async () => {
    const { renderTile } = await import('/src/studio/render.ts'); const { useStudio } = await import('/src/studio/store.ts');
    const source = document.createElement('canvas'); source.width = 2; source.height = 2; source.getContext('2d').fillStyle = '#f00'; source.getContext('2d').fillRect(0, 0, 2, 2);
    const p = { ...useStudio.getState().project, tileWidthMm: 100, tileHeightMm: 100, backgroundColor: '#fff', backgroundAssetId: null, assets: [{ id: 'red', name: 'red', dataUrl: source.toDataURL(), width: 2, height: 2 }], motifs: [{ id: 'm', name: 'm', assetId: 'red', xMm: 0, yMm: 50, widthMm: 20, heightMm: 20, rotation: 37, opacity: 1, visible: true, locked: false }] };
    const tile = await renderTile(p, 30); const ctx = tile.getContext('2d'); return [Array.from(ctx.getImageData(0, Math.round(tile.height / 2), 1, 1).data), Array.from(ctx.getImageData(tile.width - 1, Math.round(tile.height / 2), 1, 1).data)];
  });
  assert.ok(edgePixels.every(pixel => pixel[0] > 200 && pixel[1] < 80));
  await field('Tuchbreite', 35); await field('Tuchhöhe', 18);
  const large = await download('Tuch PNG'); assert.equal(large.readUInt32BE(16), 4134); assert.equal(large.readUInt32BE(20), 2126);
  await page.locator('.projectMenu summary').click();
  const zip = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Projekt speichern', exact: true }).click()]).then(x => x[0]);
  const zipBytes = await readFile(await zip.path()); assert.equal(zipBytes.subarray(0, 2).toString(), 'PK');
  await page.reload(); await page.locator('.upper-canvas').waitFor(); assert.equal((await state()).project.sheetWidthMm, 350);
  await page.getByLabel('Motiv hochladen', { exact: true }).setInputFiles({ name: 'artwork.pdf', mimeType: 'application/pdf', buffer: pdf });
  await page.getByRole('status').filter({ hasText: 'Fertig.' }).waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: 'Banderole', exact: true }).click();
  await page.waitForFunction(() => { const images = [...document.querySelectorAll('.packPreview img')]; return images.length === 3 && images.every(image => image.complete && image.naturalWidth > 0); });
  await page.getByRole('button', { name: 'Exportieren', exact: true }).click();
  const band = await Promise.all([page.waitForEvent('download'), page.locator('.exportPair').last().getByRole('button', { name: 'PNG', exact: true }).click()]).then(x => x[0]);
  const bandBytes = await readFile(await band.path()); assert.equal(bandBytes.readUInt32BE(16), Math.round(230 / 25.4 * 300));
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('button', { name: 'Muster', exact: true }).click();
  // A new session clears document/history and resets the view. Opening old ZIPs still works.
  const beforeNewProject = await state();
  await page.getByRole('button', { name: 'Neues Projekt', exact: true }).click();
  await page.getByRole('dialog', { name: 'Neues Projekt starten?' }).waitFor();
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  assert.deepEqual((await state()).project, beforeNewProject.project, 'Canceling a new project changed the current project');
  await page.getByRole('button', { name: 'Neues Projekt', exact: true }).click();
  await page.getByRole('button', { name: 'Neues Projekt starten', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Neues Projekt gestartet.' }).waitFor();
  assert.equal((await state()).project.motifs.length, 0); assert.equal((await state()).past, 0);
  await page.locator('.projectMenu summary').click();
  await page.getByLabel('Projekt öffnen', { exact: true }).setInputFiles({ name: 'project.zip', mimeType: 'application/zip', buffer: zipBytes });
  await page.getByRole('status').filter({ hasText: 'Fertig.' }).waitFor();
  assert.equal((await state()).project.sheetWidthMm, 350);
  const count = (await state()).project.motifs.length;
  await page.getByRole('button', { name: /Ebene .* löschen/ }).first().click(); assert.equal((await state()).project.motifs.length, count - 1);
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click(); assert.equal((await state()).project.motifs.length, count);
  // Repeated motifs remain cheap: Fabric has one proxy per motif, regardless of viewport area.
  await page.evaluate(async () => {
    const { useStudio } = await import('/src/studio/store.ts'); const s = useStudio.getState(), motif = s.project.motifs[0];
    s.setProject({ ...s.project, sheetWidthMm: 250, sheetHeightMm: 250, tileWidthMm: 100, tileHeightMm: 100, motifs: Array.from({ length: 100 }, (_, i) => ({ ...motif, id: `perf-${i}`, groupId: undefined, xMm: i % 10 * 10 + 5, yMm: Math.floor(i / 10) * 10 + 5, widthMm: 6, heightMm: 6, rotation: i % 3 * 30 })) });
  });
  await page.getByRole('button', { name: 'Tuch einpassen', exact: true }).click();
  // A locked group member must stay unchanged even when another crosses a tile edge.
  await page.evaluate(async () => { const { useStudio } = await import('/src/studio/store.ts'); const s = useStudio.getState(); s.update(p => ({ ...p, motifs: p.motifs.map((m, i) => i < 2 ? { ...m, groupId: 'locked-group', locked: i === 1 } : m) })); });
  const locked = (await state()).project.motifs[1];
  await drag(105, 5, 105, 0);
  assert.deepEqual((await state()).project.motifs[1], locked, 'Locked group member changed');
  const perfStart = Date.now(); await drag(55, 55, 2, 2); await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  assert.equal((await state()).project.motifs.length, 100); assert.ok(Date.now() - perfStart < 5000, '100-motif interaction stalled');
  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}px`);
    if (width < 900) {
      await page.getByRole('button', { name: 'Werkzeuge', exact: true }).click(); await page.getByRole('heading', { name: 'Ebenen', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Werkzeuge schließen', exact: true }).click();
    }
    assert.ok((await page.locator('.upper-canvas').boundingBox()).height > 500);
  }
  // Touch gestures move the camera without recording project changes.
  const touchState = await state();
  const cameraBefore = await page.locator('.canvasViewport').evaluate(el => Number(el.dataset.scale));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 130, y: 360, id: 1 }, { x: 230, y: 360, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 90, y: 380, id: 1 }, { x: 270, y: 380, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  assert.ok(await page.locator('.canvasViewport').evaluate((el, previous) => Number(el.dataset.scale) > previous * 1.5, cameraBefore), 'Pinch did not zoom');
  assert.deepEqual((await state()).project, touchState.project); assert.equal((await state()).past, touchState.past);
  if (process.env.SCREENSHOT) { await page.setViewportSize({ width: 1440, height: 1000 }); await page.getByRole('button', { name: 'Tuch einpassen', exact: true }).click(); await page.screenshot({ path: process.env.SCREENSHOT }); }
  // The fallback paints the same world coordinates without WebGL or WebGPU.
  const fallback = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  fallback.setDefaultTimeout(15000);
  fallback.on('pageerror', e => errors.push(e.message));
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === '2d' || type === 'bitmaprenderer' ? original.call(this, type, ...args) : null; };
    Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
  });
  await fallback.goto(process.env.APP_URL || 'http://127.0.0.1:5173/');
  await fallback.getByLabel('Motiv hochladen', { exact: true }).setInputFiles({ name: 'Blatt.svg', mimeType: 'image/svg+xml', buffer: artwork });
  await fallback.getByRole('status').filter({ hasText: 'Fertig.' }).waitFor();
  await fallback.waitForFunction(() => {
    const host = document.querySelector('.canvasViewport'), canvas = [...document.querySelectorAll('.patternSurface canvas')].at(-1);
    if (!host || !canvas) return false;
    const x = Number(host.dataset.offsetX) + 55 * Number(host.dataset.scale), y = Number(host.dataset.offsetY) + 50 * Number(host.dataset.scale);
    const pixel = canvas.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data;
    return pixel[1] > pixel[0] * 1.5 && pixel[3] === 255;
  });
  await fallback.getByRole('button', { name: 'Ebene ausblenden: Blatt.svg', exact: true }).click();
  await fallback.waitForFunction(() => {
    const host = document.querySelector('.canvasViewport'), canvas = [...document.querySelectorAll('.patternSurface canvas')].at(-1);
    const x = Number(host.dataset.offsetX) + 55 * Number(host.dataset.scale), y = Number(host.dataset.offsetY) + 50 * Number(host.dataset.scale);
    const pixel = canvas.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data;
    return pixel[0] > 240 && pixel[1] > 240;
  });
  await fallback.close();
  assert.deepEqual(errors, []);
  console.log('Browser smoke passed: repeated editing, live drafts, undo, cancel, groups, scale, camera-independent exports, 300 PPI PNG/PDF, ZIP, autosave, PDF import, packaging, new sessions, layers, 100 motifs and responsive layout.');
} finally { await browser.close(); }
