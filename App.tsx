// Workaround, not real app code: expo/AppEntry.js hardcodes
// `import App from '../../App'`, resolved relative to wherever the `expo`
// package physically sits — the repo root's node_modules in this npm
// workspaces monorepo. Metro's dev-server entry resolution for Expo Go
// consistently asks for a file at exactly this path regardless of
// watchFolders/nodeModulesPaths/disableHierarchicalLookup config on the
// customer-mobile side, so this just re-exports the real App from where
// it actually lives.
export { default } from './frontend/apps/customer-mobile/App';
