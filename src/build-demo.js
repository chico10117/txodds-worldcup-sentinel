#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { analyzeFeed } from "./analyze.js";
import { normalizeTxOddsPayload } from "./normalize-txodds.js";
import {
  renderDemoVideoHtml,
  renderComplianceHtml,
  renderJudgeBriefHtml,
  renderPlaygroundHtml,
  renderReportHtml
} from "./render-html.js";

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
    } else if (arg === "--demo-video-html") {
      artifacts.demoVideoHtmlPath = args[++index];
    } else if (arg === "--playground-html") {
      artifacts.playgroundHtmlPath = args[++index];
    } else if (arg === "--playground-js") {
      artifacts.playgroundJsPath = args[++index];
    } else if (arg === "--judge-brief-html") {
      artifacts.judgeBriefHtmlPath = args[++index];
    } else if (arg === "--compliance-html") {
      artifacts.complianceHtmlPath = args[++index];
    } else if (arg === "--manifest-json") {
      artifacts.manifestJsonPath = args[++index];
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!inputPath || !outputPath) {
    throw new Error(
      "usage: node src/build-demo.js <feed.json> <output.html> [--now ISO] [--generated-at ISO] [--report-json PATH] [--txodds-input PATH --txodds-report-json PATH] [--demo-video-html PATH] [--playground-html PATH --playground-js PATH] [--judge-brief-html PATH] [--compliance-html PATH] [--manifest-json PATH]"
    );
  }

  if (Boolean(artifacts.txOddsInputPath) !== Boolean(artifacts.txOddsReportJsonPath)) {
    throw new Error("--txodds-input and --txodds-report-json must be provided together");
  }

  if (artifacts.manifestJsonPath && !artifacts.reportJsonPath) {
    throw new Error("--manifest-json requires --report-json");
  }

  if (Boolean(artifacts.playgroundHtmlPath) !== Boolean(artifacts.playgroundJsPath)) {
    throw new Error("--playground-html and --playground-js must be provided together");
  }

  if (artifacts.playgroundHtmlPath && !artifacts.txOddsInputPath) {
    throw new Error("--playground-html requires --txodds-input");
  }

  if (artifacts.judgeBriefHtmlPath && !artifacts.txOddsInputPath) {
    throw new Error("--judge-brief-html requires --txodds-input");
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

async function artifact(path, description, summary = undefined) {
  const bytes = await readFile(path);
  return {
    path,
    description,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sizeBytes: bytes.byteLength,
    ...(summary ? { summary } : {})
  };
}

function reportSummary(report) {
  return {
    generatedAt: report.generatedAt,
    matchCount: report.matchCount,
    marketCount: report.marketCount,
    flagCount: report.flagCount,
    riskScore: report.riskScore,
    recommendedActionCount: report.recommendedActionCount,
    topRecommendedActions: report.recommendedActions.slice(0, 3).map((action) => action.code),
    topFlagCodes: report.flags.slice(0, 5).map((flag) => flag.code)
  };
}

async function buildReplayManifest({ inputPath, outputPath, artifacts, report, txOddsReport }) {
  const manifestArtifacts = [
    await artifact(outputPath, "Static public MVP HTML"),
    await artifact(artifacts.reportJsonPath, "Machine-readable fixture analyzer report", reportSummary(report)),
    await artifact(inputPath, "Replayable fixture-shaped World Cup feed"),
    await artifact("src/analyze.js", "Dependency-free odds and settlement analyzer"),
    await artifact("src/render-html.js", "Static HTML renderer"),
    await artifact("package.json", "Node scripts and reproducible build entrypoints"),
    await artifact(".github/workflows/verify.yml", "GitHub Actions public packet verification workflow"),
    await artifact("SUBMISSION.md", "Superteam field packet"),
    await artifact("REVIEW.md", "Judge review checklist"),
    await artifact("public/.well-known/ai.txt", "AI-readable public review manifest"),
    await artifact("src/verify-packet.js", "Local public-packet verifier")
  ];

  if (artifacts.txOddsInputPath && txOddsReport) {
    manifestArtifacts.splice(
      3,
      0,
      await artifact(
        artifacts.txOddsReportJsonPath,
        "Machine-readable captured TxODDS-shaped payload report",
        reportSummary(txOddsReport)
      ),
      await artifact(artifacts.txOddsInputPath, "Captured TxODDS-shaped JSON fixture"),
      await artifact("src/normalize-txodds.js", "Offline TxODDS-shaped payload normalizer")
    );
  }

  if (artifacts.demoVideoHtmlPath) {
    manifestArtifacts.splice(
      1,
      0,
      await artifact(artifacts.demoVideoHtmlPath, "Public demo video review page")
    );
  }

  if (artifacts.playgroundHtmlPath) {
    manifestArtifacts.splice(
      2,
      0,
      await artifact(artifacts.playgroundHtmlPath, "Public paste-in TxODDS judge playground"),
      await artifact(artifacts.playgroundJsPath, "Browser-only playground analyzer runtime"),
      await artifact("src/browser-playground.js", "Source for the browser-only playground runtime")
    );
  }

  if (artifacts.judgeBriefHtmlPath) {
    manifestArtifacts.splice(
      1,
      0,
      await artifact(artifacts.judgeBriefHtmlPath, "Public judge evaluation brief")
    );
  }

  if (artifacts.complianceHtmlPath) {
    manifestArtifacts.splice(
      2,
      0,
      await artifact(artifacts.complianceHtmlPath, "Public hackathon compliance note")
    );
  }

  return {
    generatedAt: report.generatedAt,
    project: "TxODDS World Cup Sentinel",
    mode: "demo-data",
    purpose:
      "Replay package for Superteam/TxODDS judges to verify the public MVP without private keys, API tokens, wallet signing, or live network calls.",
    urls: {
      liveMvp: "https://txodds-worldcup-sentinel.vercel.app",
      publicRepository: "https://github.com/chico10117/txodds-worldcup-sentinel",
      demoVideoPage: "https://txodds-worldcup-sentinel.vercel.app/demo-video.html",
      judgePlayground:
        "https://txodds-worldcup-sentinel.vercel.app/judge-playground.html",
      judgeBrief: "https://txodds-worldcup-sentinel.vercel.app/judge-brief.html",
      compliance: "https://txodds-worldcup-sentinel.vercel.app/compliance.html",
      aiTxt: "https://txodds-worldcup-sentinel.vercel.app/.well-known/ai.txt",
      demoVideo:
        "https://github.com/chico10117/txodds-worldcup-sentinel/blob/main/media/demo.mp4",
      reportJson: "https://txodds-worldcup-sentinel.vercel.app/report.json",
      txoddsCaptureReportJson:
        "https://txodds-worldcup-sentinel.vercel.app/txodds-capture-report.json",
      replayManifestJson:
        "https://txodds-worldcup-sentinel.vercel.app/replay-manifest.json"
    },
    commands: [
      "npm test",
      "npm run build",
      "npm run build:video",
      "npm run report:txodds",
      "npm run verify:packet",
      "npm run verify:ci",
      "node src/cli.js fixtures/sample-worldcup-feed.json --now 2026-06-26T06:20:00.000Z",
      "node src/cli.js fixtures/sample-txodds-capture.json --input-format txodds --now 2026-06-26T06:20:00.000Z"
    ],
    reports: {
      fixture: reportSummary(report),
      ...(txOddsReport ? { txoddsCapture: reportSummary(txOddsReport) } : {})
    },
    artifacts: manifestArtifacts,
    safety: {
      noPrivateKeys: true,
      noSeedPhrases: true,
      noApiTokens: true,
      noWalletConnectionRequired: true,
      noJudgeWalletOrAccountRequired: true,
      noPaidSubscriptionRequiredForReview: true,
      noNetworkCallsInBuild: true,
      liveTxOddsCallsIncluded: false
    }
  };
}

async function main() {
  const { inputPath, outputPath, options, artifacts } = parseArgs(process.argv.slice(2));
  const feed = await readJson(inputPath);
  const report = analyzeFeed(feed, options);
  let txOddsReport = null;
  const html = renderReportHtml(report);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
  console.log(`wrote ${outputPath}`);

  if (artifacts.demoVideoHtmlPath) {
    await mkdir(dirname(artifacts.demoVideoHtmlPath), { recursive: true });
    await writeFile(artifacts.demoVideoHtmlPath, renderDemoVideoHtml(report));
    console.log(`wrote ${artifacts.demoVideoHtmlPath}`);
  }

  if (artifacts.complianceHtmlPath) {
    await mkdir(dirname(artifacts.complianceHtmlPath), { recursive: true });
    await writeFile(artifacts.complianceHtmlPath, renderComplianceHtml(report));
    console.log(`wrote ${artifacts.complianceHtmlPath}`);
  }

  if (artifacts.reportJsonPath) {
    await writeJson(artifacts.reportJsonPath, report);
  }

  if (artifacts.txOddsInputPath) {
    const payload = await readJson(artifacts.txOddsInputPath);
    txOddsReport = analyzeFeed(normalizeTxOddsPayload(payload), options);
    await writeJson(artifacts.txOddsReportJsonPath, txOddsReport);

    if (artifacts.judgeBriefHtmlPath) {
      await mkdir(dirname(artifacts.judgeBriefHtmlPath), { recursive: true });
      await writeFile(artifacts.judgeBriefHtmlPath, renderJudgeBriefHtml(report, txOddsReport));
      console.log(`wrote ${artifacts.judgeBriefHtmlPath}`);
    }

    if (artifacts.playgroundHtmlPath) {
      await mkdir(dirname(artifacts.playgroundHtmlPath), { recursive: true });
      await writeFile(artifacts.playgroundHtmlPath, renderPlaygroundHtml(payload));
      console.log(`wrote ${artifacts.playgroundHtmlPath}`);

      await mkdir(dirname(artifacts.playgroundJsPath), { recursive: true });
      await copyFile("src/browser-playground.js", artifacts.playgroundJsPath);
      console.log(`wrote ${artifacts.playgroundJsPath}`);
    }
  }

  if (artifacts.manifestJsonPath) {
    await writeJson(
      artifacts.manifestJsonPath,
      await buildReplayManifest({ inputPath, outputPath, artifacts, report, txOddsReport })
    );
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
