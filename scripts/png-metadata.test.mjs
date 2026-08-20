import assert from "node:assert/strict";
import test from "node:test";
import { readPngMetadata } from "./png-metadata.mjs";

function chunk(type, data) {
  const value = Buffer.alloc(12 + data.length);
  value.writeUInt32BE(data.length, 0);
  value.write(type, 4, 4, "ascii");
  data.copy(value, 8);
  return value;
}

function png(colorType, extraChunks = []) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(512, 0);
  header.writeUInt32BE(512, 4);
  header[8] = 8;
  header[9] = colorType;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    ...extraChunks,
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("detects direct alpha channels", () => {
  assert.deepEqual(
    {
      bitDepth: readPngMetadata(png(6)).bitDepth,
      colorType: readPngMetadata(png(6)).colorType,
      transparent: readPngMetadata(png(6)).hasTransparency,
    },
    { bitDepth: 8, colorType: 6, transparent: true },
  );
  assert.equal(readPngMetadata(png(2)).hasTransparency, false);
});

test("detects indexed and color-key transparency through tRNS", () => {
  const transparentIndexed = png(3, [chunk("tRNS", Buffer.from([0]))]);
  const metadata = readPngMetadata(transparentIndexed);
  assert.equal(metadata.hasAlphaChannel, false);
  assert.equal(metadata.hasTransparency, true);
});

test("rejects truncated PNG chunks", () => {
  const truncated = png(2).subarray(0, 35);
  assert.throws(() => readPngMetadata(truncated), /invalid PNG chunk/);
});
