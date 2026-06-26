#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const requiredFiles = [
  "public/index.html",
  "public/judge-brief.html",
  "public/compliance.html",
  "public/demo-video.html",
  "public/judge-playground.html",
  "public/playground.js",
  "public/.well-known/ai.txt",
  "public/report.json",
  "public/txodds-capture-report.json",
  "public/replay-manifest.json",
  "README.md",
  "SUBMISSION.md",
  "REVIEW.md",
  ".github/workflows/verify.yml",
  "src/analyze.js",
  "src/normalize-txodds.js",
  "src/browser-playground.js",
  "src/verify-packet.js"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readText(path) {
  return readFile(path, "utf8");
}

async function readJson(path) {
  return JSON.parse(await readText(path));
}

async function assertContains(path, fragments) {
  const text = await readText(path);
  for (const fragment of fragments) {
    assert(text.includes(fragment), `${path} is missing ${fragment}`);
  }
}

function assertReportSummary(report, expected) {
  for (const [key, value] of Object.entries(expected)) {
    assert(
      report[key] === value,
      `${report.source ?? "report"} expected ${key}=${value}, got ${report[key]}`
    );
  }
}

async function main() {
  for (const path of requiredFiles) {
    await readText(path);
  }

  const report = await readJson("public/report.json");
  const txoddsReport = await readJson("public/txodds-capture-report.json");
  const manifest = await readJson("public/replay-manifest.json");

  assertReportSummary(report, {
    matchCount: 2,
    marketCount: 2,
    flagCount: 10,
    riskScore: 35,
    recommendedActionCount: 4
  });

  assertReportSummary(txoddsReport, {
    matchCount: 1,
    marketCount: 1,
    flagCount: 2,
    riskScore: 5,
    recommendedActionCount: 2
  });
  assert(
    report.automationReadiness?.state === "blocked",
    "fixture report must expose blocked automation readiness"
  );
  assert(
    txoddsReport.automationReadiness?.state === "blocked",
    "captured TxODDS report must expose blocked automation readiness"
  );

  assert(manifest.project === "TxODDS World Cup Sentinel", "manifest project mismatch");
  assert(manifest.mode === "demo-data", "manifest mode must stay demo-data");
  assert(manifest.artifacts.length >= 20, "manifest must include the full review packet");
  assert(manifest.commands.includes("npm run verify:packet"), "manifest must list verifier command");
  assert(manifest.commands.includes("npm run verify:ci"), "manifest must list CI verifier command");
  assert(
    manifest.reports.fixture.automationReadinessState === "blocked",
    "fixture manifest summary must include automation readiness"
  );
  assert(
    manifest.reports.txoddsCapture.automationReadinessState === "blocked",
    "captured manifest summary must include automation readiness"
  );

  const artifactPaths = new Set(manifest.artifacts.map((artifact) => artifact.path));
  for (const path of [
    "REVIEW.md",
    ".github/workflows/verify.yml",
    "src/verify-packet.js",
    "public/.well-known/ai.txt",
    ...requiredFiles.slice(0, 9)
  ]) {
    assert(artifactPaths.has(path), `manifest is missing artifact ${path}`);
  }

  const expectedSafety = {
    noPrivateKeys: true,
    noSeedPhrases: true,
    noApiTokens: true,
    noWalletConnectionRequired: true,
    noJudgeWalletOrAccountRequired: true,
    noPaidSubscriptionRequiredForReview: true,
    noNetworkCallsInBuild: true,
    liveTxOddsCallsIncluded: false
  };

  for (const [key, value] of Object.entries(expectedSafety)) {
    assert(manifest.safety[key] === value, `manifest safety.${key} must be ${value}`);
  }

  await assertContains("public/index.html", [
    "World Cup odds integrity watch",
    "What an automated strategy should do",
    "Can an agent act on this snapshot?",
    "Automation gate",
    "Pause settlement automation",
    "judge-brief.html",
    ".well-known/ai.txt",
    "replay-manifest.json"
  ]);
  await assertContains("public/judge-brief.html", [
    "Judge evaluation brief",
    "Captured TxODDS report",
    "Strategy guardrails",
    "Fixture safety gates"
  ]);
  await assertContains("public/compliance.html", [
    "without wallet or account setup",
    "API token"
  ]);
  await assertContains("public/judge-playground.html", [
    "Paste captured TxODDS JSON",
    "does not connect a wallet"
  ]);
  await assertContains("public/.well-known/ai.txt", [
    "TxODDS World Cup Sentinel",
    "deterministic recommended agent actions",
    "automation readiness gates",
    "no private keys"
  ]);

  const playgroundRuntime = await readText("public/playground.js");
  for (const forbidden of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "navigator."]) {
    assert(!playgroundRuntime.includes(forbidden), `playground runtime must not contain ${forbidden}`);
  }

  const result = {
    ok: true,
    project: manifest.project,
    mode: manifest.mode,
    artifactCount: manifest.artifacts.length,
    fixtureRiskScore: report.riskScore,
    txoddsCaptureRiskScore: txoddsReport.riskScore,
    fixtureRecommendedActions: report.recommendedActionCount,
    txoddsCaptureRecommendedActions: txoddsReport.recommendedActionCount,
    safety: manifest.safety
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`packet verification failed: ${error.message}`);
  process.exitCode = 1;
});
