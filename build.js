import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const opts = {
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "esm",
  outfile: "main.js",
  platform: "browser",
  target: "es2022",
  minify: false,
  sourcemap: true,
  external: ["/js/lib/lit-html.js", "@impro.social/impro-plugin"],
};

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(opts);
  console.log("Build complete → main.js");
}
