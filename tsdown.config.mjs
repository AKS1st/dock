/**
 * tsdown build for dock, following the minimal plugin pattern
 * (dsh-mermaid / dsh-login): the host half compiles with tsc to
 * lib/types (ESM node) and tsdown repackages it to lib/index.js; the client
 * half bundles src/client/index.ts into a single CJS closure factory
 * registered with window.__ModuleLoader__.load({ id, factory }).
 *
 * The client bundle keeps react / react-dom / cordis external (they resolve
 * through the web shell's frozen module table at runtime) and inlines
 * everything else. Phase 1 has no lazy chunks: the /workbench/bundle code
 * splitting mechanism is planned for Phase 2.
 */
const id = 'dock-base'

/** Module specifiers the web shell shares into the frozen module table. */
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-runtime/client',
]

export default [{
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  fixedExtension: false,
  dts: false,
  clean: false,
}, {
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  external: CLIENT_EXTERNALS,
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}]
