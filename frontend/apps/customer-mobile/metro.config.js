const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Some dependencies (e.g. zustand's `middleware` entry, which bundles its
// devtools integration) ship an ESM build that references `import.meta`
// when resolved via the "import" package.json export condition. Metro's
// web bundler doesn't support `import.meta` outside a real ES module and
// crashes the whole bundle on load. Dropping "import"/"browser" from the
// condition list forces Metro to always resolve the CommonJS build
// instead, which doesn't have this problem.
config.resolver.unstable_conditionNames = ['react-native', 'require', 'default'];

module.exports = config;
