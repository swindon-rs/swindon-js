const path = require('path');
const rollup = require('rollup');
const babel = require('rollup-plugin-babel');
const commonjs = require('rollup-plugin-commonjs');

const entry = 'src/swindon.js';
const external = path.resolve(entry);
const moduleName = 'swindon';

const plugins = [
  babel({
    "presets": [ "es2015-rollup", "stage-0" ],
    "plugins": [
      ["transform-es2015-classes", { "loose": true }],
    ],
    "babelrc": false
  }),
  commonjs(),
];

rollup.rollup({
    entry: entry,
    external: external,
    plugins: plugins,
})
.then((bundle) => bundle.write({
    format: 'umd',
    moduleName: moduleName,
    dest: entry.replace('src', 'lib'),
  }),
  (error) => {
    console.error(error)
  }
);
