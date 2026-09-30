import { PPI } from './studio/model';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_PIXELS_PER_METER_PER_PPI = 1 / 0.0254;
const OUTPUT_PPI = PPI;

function createCrcTable(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
}

const CRC_TABLE = createCrcTable();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index++) {
    const byte = bytes[index];
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function encodeChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  const typeBytes = Uint8Array.from([
    type.charCodeAt(0),
    type.charCodeAt(1),
    type.charCodeAt(2),
    type.charCodeAt(3),
  ]);

  view.setUint32(0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);

  const crcInput = chunk.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(crcInput));
  return chunk;
}

function hasPngSignature(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Der Browser konnte das PNG nicht erzeugen.'));
      }
    }, 'image/png');
  });
}

/** Adds print-size metadata while leaving every decoded pixel unchanged. */
export async function setPngResolution(blob: Blob, ppi = OUTPUT_PPI): Promise<Blob> {
  if (!Number.isFinite(ppi) || ppi <= 0) {
    throw new Error('Die PNG-Auflösung muss größer als 0 sein.');
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (!hasPngSignature(bytes)) {
    throw new Error('Die Bilddatei ist kein gültiges PNG.');
  }

  const chunks: Array<{ type: string; start: number; end: number }> = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = PNG_SIGNATURE.length;
  let hasResolutionChunk = false;

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > bytes.length) {
      throw new Error('Das PNG enthält einen unvollständigen Datenblock.');
    }

    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    chunks.push({ type, start: offset, end: chunkEnd });
    hasResolutionChunk ||= type === 'pHYs';
    offset = chunkEnd;
    if (type === 'IEND') break;
  }

  if (offset !== bytes.length || chunks.length === 0 || chunks[0].type !== 'IHDR') {
    throw new Error('Das PNG ist beschädigt oder unvollständig.');
  }

  const pixelsPerMeter = Math.round(ppi * PNG_PIXELS_PER_METER_PER_PPI);
  const resolutionData = new Uint8Array(9);
  const resolutionView = new DataView(resolutionData.buffer);
  resolutionView.setUint32(0, pixelsPerMeter);
  resolutionView.setUint32(4, pixelsPerMeter);
  resolutionData[8] = 1; // Resolution unit: meter.
  const resolutionChunk = encodeChunk('pHYs', resolutionData);

  const output: Uint8Array[] = [bytes.subarray(0, PNG_SIGNATURE.length)];
  let resolutionWritten = false;

  for (const chunk of chunks) {
    if (chunk.type === 'pHYs') {
      if (!resolutionWritten) {
        output.push(resolutionChunk);
        resolutionWritten = true;
      }
      continue;
    }

    output.push(bytes.subarray(chunk.start, chunk.end));
    if (chunk.type === 'IHDR' && !hasResolutionChunk) {
      output.push(resolutionChunk);
      resolutionWritten = true;
    }
  }

  return new Blob(
    output.map((part) => Uint8Array.from(part).buffer),
    { type: 'image/png' },
  );
}

export async function canvasToPrintPng(canvas: HTMLCanvasElement, ppi = OUTPUT_PPI): Promise<Blob> {
  return setPngResolution(await canvasToBlob(canvas), ppi);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
