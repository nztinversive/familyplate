function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function readPngMetadata(buffer, filename = "PNG") {
  const signature = "89504e470d0a1a0a";
  assert(
    buffer.length >= 33 && buffer.subarray(0, 8).toString("hex") === signature,
    `${filename} must be a PNG file.`,
  );
  assert(
    buffer.subarray(12, 16).toString("ascii") === "IHDR",
    `${filename} has an invalid PNG header.`,
  );

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  let hasTransparencyChunk = false;
  let sawIend = false;
  let offset = 8;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const nextOffset = offset + 12 + length;
    assert(nextOffset <= buffer.length, `${filename} has an invalid PNG chunk.`);
    if (type === "tRNS") hasTransparencyChunk = true;
    offset = nextOffset;
    if (type === "IEND") {
      sawIend = true;
      break;
    }
  }
  assert(
    sawIend && offset === buffer.length,
    `${filename} has an invalid PNG chunk stream or is truncated.`,
  );

  const hasAlphaChannel = colorType === 4 || colorType === 6;
  return {
    width,
    height,
    bitDepth,
    colorType,
    hasAlphaChannel,
    hasTransparency: hasAlphaChannel || hasTransparencyChunk,
  };
}
