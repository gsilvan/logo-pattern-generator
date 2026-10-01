import type { PackagingLayer } from './model';
import type { Font } from 'opentype.js';
export const fontFamilies = ['Liberation Sans', 'Liberation Serif', 'Liberation Mono'];
export function mappedFont(name: string) {
  if (fontFamilies.includes(name)) return name;
  if (/sans|arial|verdana|helvetica|system/i.test(name)) return 'Liberation Sans';
  if (/mono|courier/i.test(name)) return 'Liberation Mono';
  if (/serif|georgia|times/i.test(name)) return 'Liberation Serif';
  return 'Liberation Sans';
}
export const fontStyle = (layer: Pick<PackagingLayer, 'bold' | 'italic'>) =>
  layer.bold ? (layer.italic ? 'bolditalic' : 'bold') : layer.italic ? 'italic' : 'normal';
const variants = { normal: 'Regular', bold: 'Bold', italic: 'Italic', bolditalic: 'BoldItalic' };
export type LoadedFont = {
  family: string;
  style: string;
  bytes: ArrayBuffer;
  font: Font;
  base64: string;
};
const cache = new Map<string, Promise<LoadedFont>>();
export function loadFont(layer: Pick<PackagingLayer, 'fontFamily' | 'bold' | 'italic'>) {
  const family = mappedFont(layer.fontFamily),
    style = fontStyle(layer),
    key = family + style;
  if (!cache.has(key))
    cache.set(
      key,
      (async () => {
        const filename = `${family.replaceAll(' ', '')}-${variants[style]}.ttf`;
        const response = await fetch(`${import.meta.env.BASE_URL}fonts/${filename}`);
        if (!response.ok) throw new Error(`Schrift konnte nicht geladen werden: ${family}`);
        const bytes = await response.arrayBuffer();
        const face = new FontFace(family, bytes, {
          weight: layer.bold ? '700' : '400',
          style: layer.italic ? 'italic' : 'normal',
        });
        await face.load();
        document.fonts.add(face);
        const { parse } = await import('opentype.js');
        let binary = '';
        for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
        return { family, style, bytes, font: parse(bytes), base64: btoa(binary) };
      })().catch((error) => {
        cache.delete(key);
        throw error;
      }),
    );
  return cache.get(key)!;
}
