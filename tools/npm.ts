import * as esbuild from "npm:esbuild";
import * as ts from "npm:typescript";

import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";
import { assertEquals, assertNotEquals } from "jsr:@std/assert";

import config from "../deno.json" with { type: "json" };

const files = ["src/mod.ts"];
const rootDir = `${import.meta.dirname}/..`;
const destination = "dist";

///
/// create javascript bundles
///

const bundle: esbuild.BuildOptions = {
  entryPoints: files,
  absWorkingDir: rootDir,
  bundle: true,
  minify: true,
  platform: "node",
  plugins: [...denoPlugins()],
  external: ["@noble/ed25519"],
};

await esbuild.build({
  ...bundle,
  format: "esm",
  outfile: `${destination}/bundle.mjs`,
});

await esbuild.build({
  ...bundle,
  format: "cjs",
  outfile: `${destination}/bundle.js`,
});

await esbuild.stop();

///
/// create typescript type definitions
///

const options: ts.CompilerOptions = {
  declaration: true,
  emitDeclarationOnly: true,
  skipLibCheck: true,
  esModuleInterop: true,
  rootDir,
};

ts.createProgram(files, options).emit(undefined, (fileName, data) => {
  assertEquals(fileName, "src/mod.d.ts");
  Deno.writeTextFile(`${destination}/bundle.d.ts`, data);
});

///
/// create package.json
///

function asNodeDependency(importString: string): Record<string, string> {
  const match = importString.match(
    /^(?:\w+:)?(?<packageName>(?:@\w+\/)\w+)(?:@(?<version>.*))$/,
  );
  assertNotEquals(match, null);
  const packageName = match!.groups!["packageName"];
  const version = match!.groups!["version"];

  const result: Record<string, string> = {};
  result[packageName] = version;
  return result;
}

await Deno.writeTextFile(
  `${destination}/package.json`,
  JSON.stringify(
    {
      name: config.name,
      version: config.version,
      description: "A lightweight token generator for 4Players ODIN",
      homepage: "https://www.4players.io",
      repository: {
        type: "git",
        url: "https://github.com/4Players/odin-tokens.git",
      },
      keywords: [
        "authentication",
        "ed25519",
        "odin",
        "sdk",
        "token",
        "voice",
        "voip",
      ],
      private: false,
      license: config.license,
      main: "bundle.js",
      module: "bundle.mjs",
      types: "bundle.d.ts",
      engines: { node: ">=14" },
      dependencies: { ...asNodeDependency(config.imports["@noble/ed25519"]) },
    },
    null,
    2,
  ),
);

///
/// Copy miscellaneous project files
///

await Deno.copyFile(`${rootDir}/README.md`, `${destination}/README.md`);
await Deno.copyFile(`${rootDir}/LICENSE`, `${destination}/LICENSE`);
