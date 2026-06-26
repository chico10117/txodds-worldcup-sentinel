#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { analyzeFeed } from "./analyze.js";

function parseArgs(argv) {
  const args = [...argv];
  const inputPath = args.shift();
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--now") {
      options.now = args[++index];
    } else if (arg === "--stale-minutes") {
      options.staleMinutes = Number(args[++index]);
    } else if (arg === "--move-threshold") {
      options.moveThresholdPctPoints = Number(args[++index]);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!inputPath) {
    throw new Error("usage: node src/cli.js <feed.json> [--now ISO] [--stale-minutes N] [--move-threshold N]");
  }

  return { inputPath, options };
}

async function main() {
  const { inputPath, options } = parseArgs(process.argv.slice(2));
  const raw = await readFile(inputPath, "utf8");
  const feed = JSON.parse(raw);
  const report = analyzeFeed(feed, options);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
