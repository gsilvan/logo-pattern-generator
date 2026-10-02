import type { PackagingLayer } from './model';
import type { Font } from 'opentype.js';

export const fontFamilies = ['Liberation Sans', 'Liberation Serif', 'Liberation Mono'];
export type LocalFont = {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  blob(): Promise<Blob>;
};

const localFonts = new Map<string, LocalFont>();
const loadedFaces = new Set<string>();
const cache = new Map<string, Promise<LoadedFont>>();
const variants = { normal: 'Regular', bold: 'Bold', italic: 'Italic', bolditalic: 'BoldItalic' };

export function mappedFont(name: string) {
  if (fontFamilies.includes(name)) return name;
  if (/sans|arial|verdana|helvetica|system/i.test(name)) return 'Liberation Sans';
  if (/mono|courier/i.test(name)) return 'Liberation Mono';
  if (/serif|georgia|times/i.test(name)) return 'Liberation Serif';
  return 'Liberation Sans';
}

export const fontStyle = (layer: Pick<PackagingLayer, 'bold' | 'italic'>) =>
  layer.bold ? (layer.italic ? 'bolditalic' : 'bold') : layer.italic ? 'italic' : 'normal';

export function localStyle(style: string) {
  return {
    bold: /bold|black|heavy|demi/i.test(style),
    italic: /italic|oblique/i.test(style),
  };
}

export function localFontSupported() {
  return typeof window !== 'undefined' && 'queryLocalFonts' in window;
}

export async function requestLocalFonts(): Promise<LocalFont[]> {
  const query = (window as Window & { queryLocalFonts?: () => Promise<LocalFont[]> })
    .queryLocalFonts;
  if (!query) throw new Error('Dieser Browser kann installierte Schriften nicht freigeben.');
  let result: LocalFont[];
  try {
    result = await query.call(window);
  } catch {
    throw new Error('Zugriff auf lokale Schriften nicht erlaubt. Bitte erneut freigeben.');
  }
  localFonts.clear();
  for (const font of result)
    if (font.family && font.postscriptName && typeof font.blob === 'function')
      localFonts.set(font.postscriptName, font);
  return [...localFonts.values()].sort((a, b) =>
    `${a.family} ${a.style}`.localeCompare(`${b.family} ${b.style}`, 'de'),
  );
}

export function localFontAvailable(postscriptName: string) {
  return localFonts.has(postscriptName);
}

const faceAlias = (postscriptName: string) =>
  `local-font-${[...postscriptName].map((char) => char.charCodeAt(0).toString(16)).join('')}`;

export function fontRenderFamily(layer: Pick<PackagingLayer, 'fontFamily' | 'fontPostscriptName'>) {
  const postscriptName = layer.fontPostscriptName;
  return postscriptName && loadedFaces.has(postscriptName)
    ? faceAlias(postscriptName)
    : layer.fontFamily;
}

export type LoadedFont = { family: string; style: string; font: Font };

export function loadFont(
  layer: Pick<PackagingLayer, 'fontFamily' | 'fontPostscriptName' | 'bold' | 'italic'>,
) {
  const postscriptName = layer.fontPostscriptName;
  const family = postscriptName ? faceAlias(postscriptName) : mappedFont(layer.fontFamily);
  const style = postscriptName ? 'normal' : fontStyle(layer);
  const key = postscriptName ? `local:${postscriptName}` : `bundle:${family}:${style}`;
  if (!cache.has(key))
    cache.set(
      key,
      (async () => {
        let bytes: ArrayBuffer;
        if (postscriptName) {
          const source = localFonts.get(postscriptName);
          if (!source)
            throw new Error(
              `Schrift „${layer.fontFamily}“ fehlt. Lokale Schriften freigeben oder eine andere Schrift wählen.`,
            );
          try {
            bytes = await (await source.blob()).arrayBuffer();
          } catch {
            throw new Error(
              `Schrift „${layer.fontFamily}“ konnte nicht gelesen werden. Bitte erneut freigeben.`,
            );
          }
        } else {
          const filename = `${family.replaceAll(' ', '')}-${variants[style]}.ttf`;
          const response = await fetch(`${import.meta.env.BASE_URL}fonts/${filename}`);
          if (!response.ok) throw new Error(`Schrift konnte nicht geladen werden: ${family}`);
          bytes = await response.arrayBuffer();
        }
        const { parse } = await import('opentype.js');
        let font: Font;
        try {
          font = parse(bytes);
        } catch {
          throw new Error(`Schrift „${layer.fontFamily}“ kann nicht in Pfade umgewandelt werden.`);
        }
        try {
          const face = new FontFace(family, bytes, {
            weight: postscriptName ? '400' : layer.bold ? '700' : '400',
            style: postscriptName ? 'normal' : layer.italic ? 'italic' : 'normal',
          });
          await face.load();
          document.fonts.add(face);
        } catch {
          throw new Error(`Schrift „${layer.fontFamily}“ kann nicht dargestellt werden.`);
        }
        if (postscriptName) loadedFaces.add(postscriptName);
        return { family, style, font };
      })().catch((error) => {
        cache.delete(key);
        throw error;
      }),
    );
  return cache.get(key)!;
}
