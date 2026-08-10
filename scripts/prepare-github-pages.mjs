import { copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outputDir = fileURLToPath(new URL("../dist/client/", import.meta.url));
const requestedBase = process.argv[2] ?? "/zhoumapo-manager-super-assistant-demo/";
const base = `/${requestedBase.replace(/^\/+|\/+$/g, "")}/`;
const textExtensions = new Set([".html", ".js", ".css"]);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(file));
    else files.push(file);
  }
  return files;
}

const files = await listFiles(outputDir);
for (const file of files) {
  if (!textExtensions.has(extname(file))) continue;
  const original = await readFile(file, "utf8");
  const patched = original
    .replaceAll('"/assets/', `"${base}assets/`)
    .replaceAll("'/assets/", `'${base}assets/`)
    .replaceAll("url(/assets/", `url(${base}assets/`);
  if (patched !== original) await writeFile(file, patched);
}

await copyFile(join(outputDir, "index.html"), join(outputDir, "404.html"));
await writeFile(join(outputDir, ".nojekyll"), "");

const remaining = [];
for (const file of files) {
  if (!textExtensions.has(extname(file))) continue;
  const content = await readFile(file, "utf8");
  if (content.includes('"/assets/') || content.includes("'/assets/") || content.includes("url(/assets/")) remaining.push(file);
}

if (remaining.length > 0) {
  throw new Error(`Unpatched root asset references remain:\n${remaining.join("\n")}`);
}

console.log(`Prepared GitHub Pages bundle for ${base}`);
