import { readdir, readFile, stat } from "node:fs/promises";
import { readPngMetadata } from "./png-metadata.mjs";

const readText = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

const assetUrl = (relativePath) =>
  new URL(`../apps/mobile/store/google-play/${relativePath}`, import.meta.url);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function validatePng(relativePath, expected) {
  const filename = `apps/mobile/store/google-play/${relativePath}`;
  const url = assetUrl(relativePath);
  const [buffer, file] = await Promise.all([readFile(url), stat(url)]);
  const png = readPngMetadata(buffer, filename);

  assert(
    png.width === expected.width && png.height === expected.height,
    `${filename} must be ${expected.width} x ${expected.height}; found ${png.width} x ${png.height}.`,
  );
  assert(
    file.size <= expected.maximumBytes,
    `${filename} is ${file.size} bytes; maximum is ${expected.maximumBytes}.`,
  );
  assert(
    png.bitDepth === expected.bitDepth && png.colorType === expected.colorType,
    `${filename} must use PNG bit depth ${expected.bitDepth} and color type ${expected.colorType}; found bit depth ${png.bitDepth} and color type ${png.colorType}.`,
  );
  if (expected.alpha === true) {
    assert(
      png.hasTransparency,
      `${filename} must contain an alpha channel or transparency data.`,
    );
  }
  if (expected.alpha === false) {
    assert(
      !png.hasTransparency,
      `${filename} must not contain an alpha channel or tRNS transparency data.`,
    );
  }

  return { ...png, bytes: file.size };
}

async function readMetadataField(filename) {
  const raw = await readText(
    `apps/mobile/store/google-play/metadata/en-US/${filename}`,
  );
  assert(raw.endsWith("\n"), `${filename} must end with one newline.`);
  return raw.slice(0, -1);
}

const listing = {
  title: await readMetadataField("title.txt"),
  shortDescription: await readMetadataField("short-description.txt"),
  fullDescription: await readMetadataField("full-description.txt"),
  releaseNotes: await readMetadataField("release-notes.txt"),
};

const limits = {
  title: 30,
  shortDescription: 80,
  fullDescription: 4_000,
  releaseNotes: 500,
};

for (const [field, maximum] of Object.entries(limits)) {
  const value = listing[field];
  assert(typeof value === "string", `${field} must be a string.`);
  assert(value.trim() === value, `${field} must not have surrounding whitespace.`);
  assert(value.length > 0, `${field} must not be empty.`);
  assert(
    value.length <= maximum,
    `${field} is ${value.length} characters; Google Play allows ${maximum}.`,
  );
}

assert(
  listing.fullDescription.includes(
    "FamilyPlate is not a medical device and does not diagnose, treat, cure, or prevent any medical condition.",
  ),
  "The full description must include the health-app disclaimer.",
);
assert(
  listing.fullDescription.includes("https://familyplate.co/privacy"),
  "The full description must link to the privacy policy.",
);
assert(
  listing.fullDescription.includes("https://familyplate.co/terms"),
  "The full description must link to the terms.",
);

const storeConfig = JSON.parse(await readText("apps/mobile/store.config.json"));
assert(
  !("demoPassword" in storeConfig.apple.review),
  "Reviewer passwords must not be committed in store.config.json.",
);

const privacyPage = await readText("apps/web/src/app/privacy/page.tsx");
for (const provider of ["Google Play", "RevenueCat", "PostHog", "Sentry", "OpenAI"]) {
  assert(
    privacyPage.includes(provider),
    `Privacy policy must describe ${provider}.`,
  );
}

const termsPage = await readText("apps/web/src/app/terms/page.tsx");
for (const provider of ["Google Play", "RevenueCat", "PostHog", "Sentry", "OpenAI"]) {
  assert(termsPage.includes(provider), `Terms must describe ${provider}.`);
}

const deletionPage = await readText("apps/web/src/app/delete-account/page.tsx");
assert(
  deletionPage.includes("mailto:support@familyplate.co?subject=FamilyPlate%20account%20deletion%20request"),
  "The public deletion page must provide a specific email request path.",
);
assert(
  deletionPage.includes("associated personal data"),
  "The public deletion page must cover account and associated-data deletion.",
);

const playIcon = await validatePng("graphics/play-icon.png", {
  width: 512,
  height: 512,
  maximumBytes: 1_024 * 1_024,
  bitDepth: 8,
  colorType: 6,
  alpha: true,
});
const featureGraphic = await validatePng("graphics/feature-graphic.png", {
  width: 1_024,
  height: 500,
  maximumBytes: 15 * 1_024 * 1_024,
  bitDepth: 8,
  colorType: 2,
  alpha: false,
});

const screenshotDirectory = assetUrl("screenshots/en-US/phone/");
let screenshotFiles = [];
try {
  screenshotFiles = (await readdir(screenshotDirectory))
    .filter((filename) => filename.endsWith(".png"))
    .sort();
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
assert(
  screenshotFiles.length >= 4,
  `At least four Android phone screenshots are required; found ${screenshotFiles.length}.`,
);
for (const filename of screenshotFiles) {
  await validatePng(`screenshots/en-US/phone/${filename}`, {
    width: 1_080,
    height: 1_920,
    maximumBytes: 8 * 1_024 * 1_024,
    bitDepth: 8,
    colorType: 2,
    alpha: false,
  });
}

console.log("Google Play launch materials are structurally valid.");
for (const field of Object.keys(limits)) {
  console.log(`${field}: ${listing[field].length}/${limits[field]} characters`);
}
console.log(`play icon: ${playIcon.width}x${playIcon.height}, alpha channel present`);
console.log(
  `feature graphic: ${featureGraphic.width}x${featureGraphic.height}, no alpha channel`,
);
console.log(`Android screenshots: ${screenshotFiles.length} at 1080x1920`);
