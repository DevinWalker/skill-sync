#!/usr/bin/env node
// Render src-tauri/icons/source.svg to a 1024x1024 PNG.
// Used as input for `pnpm tauri icon` which fans it out to all formats.
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve("src-tauri/icons/source.svg");
const out = resolve("src-tauri/icons/source.png");
const svg = readFileSync(src, "utf8");

const png = new Resvg(svg, { fitTo: { mode: "width", value: 1024 } })
  .render()
  .asPng();

writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes)`);
