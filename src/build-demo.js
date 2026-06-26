#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { analyzeFeed } from "./analyze.js";
import { normalizeTxOddsPayload } from "./normalize-txodds.js";
import { renderReportHtml } from "./render-html.js";

function parseArgs(argv) {
  const args = [...argv];
  const inputPath = args.shift();
  const outputPath = args.shift();
  const options = {};
  const artifacts = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--now") {
      options.now = args[++index];
    } else if (arg === "--generated-at") {
      options.generatedAt = args[++index];
    } else if (arg === "--report-json") {
      artifacts.reportJsonPath = args[++index];
    } else if (arg === "--txodds-input") {
      artifacts.txOddsInputPath = args[++index];
    } else if (arg === "--txodds-report-json") {
      artifacts.txOddsReportJsonPath = args[++index];
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!inputPath || !outputPath) {
    throw new Error(
      "usage: node src/build-demo.js <feed.json> <output.html> [--now ISO] [--generated-at ISO] [--report-json PATH] [--txodds-input PATH --txodds-report-json PATH]"
    );
  }

  if (Boolean(artifacts.txOddsInputPath) !== Boolean(artifacts.txOddsReportJsonPath)) {
    throw new Error("--txodds-input and --txodds-report-json must be provided together");
  }

  return { inputPath, outputPath, options, artifacts };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${path}`);
}

async function main() {
  const { inputPath, outputPath, options, artifacts } = parseArgs(process.argv.slice(2));
  const feed = await readJson(inputPath);
  const report = analyzeFeed(feed, options);
  const html = renderReportHtml(report);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
  console.log(`wrote ${outputPath}`);

  if (artifacts.reportJsonPath) {
    await writeJson(artifacts.reportJsonPath, report);
  }

  if (artifacts.txOddsInputPath) {
    const payload = await readJson(artifacts.txOddsInputPath);
    const txOddsReport = analyzeFeed(normalizeTxOddsPayload(payload), options);
    await writeJson(artifacts.txOddsReportJsonPath, txOddsReport);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
