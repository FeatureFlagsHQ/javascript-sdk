const typescript = require('rollup-plugin-typescript2');
const pkg = require('./package.json');

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  'crypto',
  'events',
  'os',
  'url',
  'util'
];

module.exports = [
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    external,
    plugins: [
      typescript({
        typescript: require('typescript'),
        tsconfig: 'tsconfig.build.json',
        clean: true
      })
    ]
  },
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: pkg.module,
      format: 'esm',
      sourcemap: true
    },
    external,
    plugins: [
      typescript({
        typescript: require('typescript'),
        tsconfig: 'tsconfig.build.json',
        clean: true
      })
    ]
  }
];