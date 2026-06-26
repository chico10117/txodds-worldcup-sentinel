#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { analyzeFeed } from "./analyze.js";
import { renderReportHtml } from "./render-html.js";

function parseArgs(argv) {
  const args = [...argv];
  const inputPath = args.shift();
  const outputPath = args.shift();
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--now") {
      options.now = args[++index];
    } else if (arg === "--generated-at") {
      options.generatedAt = args[++index];
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!inputPath || !outputPath) {
    throw new Error("usage: node src/build-demo.js <feed.json> <output.html> [--now ISO] [--generated-at ISO]");
  }

  return { inputPath, outputPath, options };
}

async function main() {
  const { inputPath, outputPath, options } = parseArgs(process.argv.slice(2));
  const feed = JSON.parse(await readFile(inputPath, "utf8"));
  const report = analyzeFeed(feed, options);
  const html = renderReportHtml(report);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
