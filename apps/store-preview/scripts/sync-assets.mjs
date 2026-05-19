import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const appRoot = join(root, "..");
const repoRoot = join(appRoot, "..", "..");
const sourceDir = join(repoRoot, "apps", "mobile", "store-assets", "ios-69");
const iconSource = join(repoRoot, "apps", "mobile", "assets", "images", "icon.png");
const destinationDir = join(appRoot, "public", "screenshots");
const destinationImageDir = join(appRoot, "public", "images");

const screenshots = [
  "01-pantry.png",
  "02-tonight.png",
  "04-cookbook.png",
  "05-grocery.png",
];

mkdirSync(destinationDir, { recursive: true });
mkdirSync(destinationImageDir, { recursive: true });

for (const screenshot of screenshots) {
  copyFileSync(join(sourceDir, screenshot), join(destinationDir, screenshot));
}

copyFileSync(iconSource, join(destinationImageDir, "icon.png"));

console.log(`Synced ${screenshots.length} screenshots into ${destinationDir}`);
