import { readFile } from "node:fs/promises";

const readText = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

console.log("Google Play launch materials are structurally valid.");
for (const field of Object.keys(limits)) {
  console.log(`${field}: ${listing[field].length}/${limits[field]} characters`);
}
