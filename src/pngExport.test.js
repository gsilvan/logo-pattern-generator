import { setPngResolution } from "./pngExport";

if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

function makeChunk(type, data) {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(Array.from(type).map((character) => character.charCodeAt(0)), 4);
  chunk.set(data, 8);
  return chunk;
}

function createPng(withResolution = false) {
  const ihdrData = new Uint8Array(13);
  const idatData = Uint8Array.from([1, 2, 3, 4]);
  const chunks = [makeChunk("IHDR", ihdrData)];

  if (withResolution) {
    const resolution = new Uint8Array(9);
    const view = new DataView(resolution.buffer);
    view.setUint32(0, 3780);
    view.setUint32(4, 3780);
    resolution[8] = 1;
    chunks.push(makeChunk("pHYs", resolution));
  }

  chunks.push(makeChunk("IDAT", idatData), makeChunk("IEND", new Uint8Array(0)));
  return new Blob([PNG_SIGNATURE, ...chunks], { type: "image/png" });
}

async function readChunks(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks = [];
  let offset = PNG_SIGNATURE.length;

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    chunks.push({
      type,
      bytes: bytes.subarray(offset, end),
      data: bytes.subarray(offset + 8, offset + 8 + length),
    });
    offset = end;
    if (type === "IEND") break;
  }

  return chunks;
}

describe("setPngResolution", () => {
  it("adds print-resolution metadata without changing image data chunks", async () => {
    const inputChunks = await readChunks(createPng());
    const outputChunks = await readChunks(await setPngResolution(createPng()));
    const resolutionChunk = outputChunks.find((chunk) => chunk.type === "pHYs");

    expect(outputChunks.map((chunk) => chunk.type)).toEqual([
      "IHDR",
      "pHYs",
      "IDAT",
      "IEND",
    ]);
    expect(new DataView(resolutionChunk.data.buffer, resolutionChunk.data.byteOffset).getUint32(0)).toBe(11811);
    expect(new DataView(resolutionChunk.data.buffer, resolutionChunk.data.byteOffset).getUint32(4)).toBe(11811);
    expect(resolutionChunk.data[8]).toBe(1);
    expect(Array.from(outputChunks[0].bytes)).toEqual(Array.from(inputChunks[0].bytes));
    expect(Array.from(outputChunks[2].bytes)).toEqual(Array.from(inputChunks[1].bytes));
    expect(Array.from(outputChunks[3].bytes)).toEqual(Array.from(inputChunks[2].bytes));
  });

  it("replaces existing resolution metadata instead of duplicating it", async () => {
    const outputChunks = await readChunks(
      await setPngResolution(createPng(true), 300),
    );

    expect(outputChunks.filter((chunk) => chunk.type === "pHYs")).toHaveLength(1);
  });
});
