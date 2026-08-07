const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../../..');

const config = getDefaultConfig(projectRoot);

// This is an npm workspaces monorepo — `expo` itself lives hoisted at the
// repo root's node_modules, not nested under this app. expo/AppEntry.js's
// own `import App from '../../App'` resolves relative to wherever it
// physically sits on disk, so without this, Metro tries to load
// <repo-root>/App instead of this app's own App.tsx and fails with
// "Unable to resolve module ../../App" on every cold start. SDK 52+'s
// getDefaultConfig is documented to auto-detect this, but it isn't
// working for this repo's layout, so it's set explicitly instead.
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// Some dependencies (e.g. zustand's `middleware` entry, which bundles its
// devtools integration) ship an ESM build that references `import.meta`
// when resolved via the "import" package.json export condition. Metro's
// web bundler doesn't support `import.meta` outside a real ES module and
// crashes the whole bundle on load. Dropping "import"/"browser" from the
// condition list forces Metro to always resolve the CommonJS build
// instead, which doesn't have this problem.
config.resolver.unstable_conditionNames = ['react-native', 'require', 'default'];

module.exports = config;
