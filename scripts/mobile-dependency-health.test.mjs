import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8"));
}

const rootPackage = readJson("package.json");
const mobilePackage = readJson("apps/mobile/package.json");
const mobileAppConfig = readJson("apps/mobile/app.json");
const webPackage = readJson("apps/web/package.json");
const convexPackage = readJson("packages/convex/package.json");
const lockfile = readJson("package-lock.json");

function installedPackages(name) {
  const suffix = `node_modules/${name}`;

  return Object.entries(lockfile.packages)
    .filter(
      ([packagePath, metadata]) =>
        metadata &&
        !metadata.link &&
        (packagePath === suffix || packagePath.endsWith(`/${suffix}`)),
    )
    .map(([packagePath, metadata]) => ({
      packagePath,
      version: metadata.version,
    }));
}

test("declares patched auth and SDK 54 package versions", () => {
  for (const manifest of [mobilePackage, webPackage, convexPackage]) {
    assert.equal(manifest.dependencies["@convex-dev/auth"], "^0.0.95");
  }

  assert.equal(webPackage.dependencies["@auth/core"], "^0.41.3");
  assert.equal(convexPackage.dependencies["@auth/core"], "^0.41.3");
  assert.equal(mobilePackage.dependencies.expo, "~54.0.37");
  assert.equal(mobilePackage.dependencies["expo-constants"], "~18.0.14");
  assert.equal(mobilePackage.dependencies["expo-file-system"], "~19.0.24");
});

test("locks every auth installation to the patched release", () => {
  assert.deepEqual(
    [...new Set(installedPackages("@convex-dev/auth").map(({ version }) => version))],
    ["0.0.95"],
  );
  assert.deepEqual(
    [...new Set(installedPackages("@auth/core").map(({ version }) => version))],
    ["0.41.3"],
  );
  assert.deepEqual(
    installedPackages("@convex-dev/auth").map(({ packagePath }) => packagePath),
    ["node_modules/@convex-dev/auth"],
    "Convex Auth must stay outside the Convex functions source tree",
  );
  assert.deepEqual(
    installedPackages("@auth/core").map(({ packagePath }) => packagePath),
    ["node_modules/@auth/core"],
    "Auth.js must stay outside the Convex functions source tree",
  );
});

test("blocks permissions that the still-photo Android app does not need", () => {
  assert.deepEqual(mobileAppConfig.expo.android.blockedPermissions, [
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.SYSTEM_ALERT_WINDOW",
  ]);
  const cameraPlugin = mobileAppConfig.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-camera",
  );
  assert.equal(cameraPlugin?.[1]?.recordAudioAndroid, false);
});

test("keeps one Expo-compatible copy of each native runtime", () => {
  const expectedVersions = {
    "@expo/vector-icons": "15.1.1",
    "expo-constants": "18.0.14",
    "expo-file-system": "19.0.24",
    "expo-font": "14.0.12",
    react: "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-css-interop": "0.2.6",
    "react-native-reanimated": "4.1.7",
    "react-native-worklets": "0.5.1",
    "@react-native/metro-config": "0.81.5",
    "@types/react": "19.1.17",
    "@types/react-dom": "19.1.11",
  };

  for (const [name, expectedVersion] of Object.entries(expectedVersions)) {
    const installations = installedPackages(name);
    assert.deepEqual(
      installations,
      [{ packagePath: `node_modules/${name}`, version: expectedVersion }],
      `${name} must have one root installation at ${expectedVersion}`,
    );
  }
});

test("does not replace Expo's monorepo-aware Metro defaults", () => {
  const metroConfig = readFileSync(
    join(repoRoot, "apps/mobile/metro.config.js"),
    "utf8",
  );

  assert.match(metroConfig, /getDefaultConfig\(__dirname\)/);
  assert.doesNotMatch(
    metroConfig,
    /watchFolders|nodeModulesPaths|disableHierarchicalLookup|extraNodeModules/,
  );
});

test("keeps root peer pins synchronized with the mobile runtime", () => {
  const expectedPins = {
    "@expo/vector-icons": "15.1.1",
    "expo-constants": "18.0.14",
    "expo-file-system": "19.0.24",
    "expo-font": "14.0.12",
    react: mobilePackage.dependencies.react,
    "react-dom": mobilePackage.dependencies["react-dom"],
    "react-native": mobilePackage.dependencies["react-native"],
    "react-native-css-interop": "0.2.6",
    "react-native-reanimated": "4.1.7",
    "react-native-worklets": mobilePackage.dependencies["react-native-worklets"],
    "@react-native/metro-config": "0.81.5",
    "@types/react": "19.1.17",
    "@types/react-dom": "19.1.11",
  };

  for (const [name, expectedVersion] of Object.entries(expectedPins)) {
    assert.equal(rootPackage.devDependencies[name], expectedVersion);
  }
});
