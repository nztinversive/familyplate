import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sampleRate = 44100;
const channels = 2;
const durationSeconds = 22.1;
const totalSamples = Math.ceil(sampleRate * durationSeconds);
const root = dirname(fileURLToPath(import.meta.url));
const outputPath = join(root, "..", "public", "familyplate-preview-audio.wav");

const left = new Float32Array(totalSamples);
const right = new Float32Array(totalSamples);

const clamp = (value, min = -1, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;

function envelope(t, attack, release, length) {
  if (t < 0 || t > length) return 0;
  const inEnv = Math.min(1, t / attack);
  const outEnv = Math.min(1, (length - t) / release);
  return Math.min(inEnv, outEnv);
}

function addTone({ start, length, freq, gain, pan = 0, attack = 0.02, release = 0.35, detune = 0 }) {
  const startSample = Math.max(0, Math.floor(start * sampleRate));
  const endSample = Math.min(totalSamples, Math.floor((start + length) * sampleRate));
  const panLeft = Math.cos((pan + 1) * Math.PI * 0.25);
  const panRight = Math.sin((pan + 1) * Math.PI * 0.25);

  for (let i = startSample; i < endSample; i += 1) {
    const t = (i - startSample) / sampleRate;
    const e = envelope(t, attack, release, length);
    const drift = 1 + detune * Math.sin(t * Math.PI * 0.38);
    const base = Math.sin(2 * Math.PI * freq * drift * t);
    const harmonic = Math.sin(2 * Math.PI * freq * 2.01 * t) * 0.28;
    const air = Math.sin(2 * Math.PI * freq * 3.02 * t) * 0.11;
    const value = (base + harmonic + air) * gain * e;
    left[i] += value * panLeft;
    right[i] += value * panRight;
  }
}

function addWhoosh({ start, length, gain, pan = 0 }) {
  let seed = 1234567;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const startSample = Math.max(0, Math.floor(start * sampleRate));
  const endSample = Math.min(totalSamples, Math.floor((start + length) * sampleRate));
  const panLeft = Math.cos((pan + 1) * Math.PI * 0.25);
  const panRight = Math.sin((pan + 1) * Math.PI * 0.25);
  let last = 0;

  for (let i = startSample; i < endSample; i += 1) {
    const t = (i - startSample) / sampleRate;
    const e = envelope(t, 0.08, 0.18, length);
    const noise = random() * 2 - 1;
    last = lerp(last, noise, 0.045);
    const shimmer = Math.sin(2 * Math.PI * (980 + t * 650) * t) * 0.05;
    const value = (last * 0.72 + shimmer) * gain * e;
    left[i] += value * panLeft;
    right[i] += value * panRight;
  }
}

// A quiet original bed: warm kitchen-table plucks, soft transition sweeps,
// and no third-party music dependency.
const chord = [146.83, 220.0, 277.18, 329.63];
for (let bar = 0; bar < 6; bar += 1) {
  const start = bar * 3.65 + 0.22;
  chord.forEach((freq, index) => {
    addTone({
      start: start + index * 0.09,
      length: 2.45,
      freq,
      gain: index === 0 ? 0.026 : 0.018,
      pan: [-0.42, 0.34, -0.16, 0.22][index],
      attack: 0.18,
      release: 1.25,
      detune: 0.0025,
    });
  });
}

[
  [0.36, 440.0, -0.28],
  [0.68, 554.37, 0.2],
  [1.02, 659.25, -0.08],
  [4.1, 554.37, 0.34],
  [4.34, 739.99, -0.2],
  [8.48, 493.88, -0.32],
  [8.72, 659.25, 0.26],
  [12.86, 440.0, 0.3],
  [13.1, 587.33, -0.22],
  [17.22, 554.37, -0.16],
  [17.48, 739.99, 0.32],
  [20.76, 329.63, -0.24],
  [21.08, 440.0, 0.22],
].forEach(([start, freq, pan]) => {
  addTone({ start, length: 1.15, freq, gain: 0.08, pan, attack: 0.008, release: 0.7 });
});

[3.86, 8.26, 12.66, 17.06, 20.54].forEach((start, index) => {
  addWhoosh({ start, length: 0.58, gain: 0.018, pan: index % 2 === 0 ? -0.16 : 0.18 });
});

// Short fade in/out and light limiting.
for (let i = 0; i < totalSamples; i += 1) {
  const t = i / sampleRate;
  const fadeIn = Math.min(1, t / 0.25);
  const fadeOut = Math.min(1, (durationSeconds - t) / 0.7);
  const master = Math.min(fadeIn, fadeOut) * 0.85;
  left[i] = Math.tanh(left[i] * master);
  right[i] = Math.tanh(right[i] * master);
}

function writeString(buffer, offset, value) {
  buffer.write(value, offset, "ascii");
}

mkdirSync(dirname(outputPath), { recursive: true });

const bytesPerSample = 2;
const dataSize = totalSamples * channels * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);

writeString(buffer, 0, "RIFF");
buffer.writeUInt32LE(36 + dataSize, 4);
writeString(buffer, 8, "WAVE");
writeString(buffer, 12, "fmt ");
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
buffer.writeUInt16LE(channels * bytesPerSample, 32);
buffer.writeUInt16LE(16, 34);
writeString(buffer, 36, "data");
buffer.writeUInt32LE(dataSize, 40);

let offset = 44;
for (let i = 0; i < totalSamples; i += 1) {
  buffer.writeInt16LE(Math.round(clamp(left[i]) * 32767), offset);
  offset += 2;
  buffer.writeInt16LE(Math.round(clamp(right[i]) * 32767), offset);
  offset += 2;
}

writeFileSync(outputPath, buffer);
console.log(`Wrote ${outputPath}`);
