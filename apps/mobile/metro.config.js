const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Let Metro see files in the whole monorepo so @familyplate/convex resolves.
config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Pin the packages that have peer-dep conflicts (notably nativewind pulling in
// a duplicate react-native) so Metro always uses the mobile app's copy.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react-native-css-interop": path.resolve(
    projectRoot,
    "node_modules/react-native-css-interop"
  ),
  "@react-native/virtualized-lists": path.resolve(
    projectRoot,
    "node_modules/react-native/node_modules/@react-native/virtualized-lists"
  ),
};

// With explicit pinning, hierarchical lookup is unnecessary and disabling it
// keeps workspace package resolution predictable.
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: "./global.css" });
