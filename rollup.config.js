const { readFileSync } = require("fs");
const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const terser = require("@rollup/plugin-terser");

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

module.exports = [
  // Build UMD pour le navigateur (utilisable via CDN)
  {
    input: "index.js",
    output: {
      name: "Marssel",
      file: pkg.browser || "dist/marssel.umd.js",
      format: "umd",
      sourcemap: true,
    },
    plugins: [resolve(), commonjs(), terser()],
  },

  // Build ESM pour les bundlers modernes (webpack, rollup, etc.)
  {
    input: "index.js",
    output: [
      {
        file: pkg.module || "dist/marssel.esm.js",
        format: "es",
        sourcemap: true,
      },
    ],
    plugins: [resolve(), terser()],
  },

  // Build CommonJS pour Node.js
  {
    input: "index.js",
    output: [
      {
        file: pkg.main || "dist/marssel.cjs.js",
        format: "cjs",
        sourcemap: true,
      },
    ],
    plugins: [resolve(), commonjs(), terser()],
  },
];
