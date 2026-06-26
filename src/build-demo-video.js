import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { analyzeFeed } from "./analyze.js";

const DEFAULT_NOW = "2026-06-26T06:20:00.000Z";
const WIDTH = 1280;
const HEIGHT = 720;
const FONT_FILE = "/System/Library/Fonts/Supplemental/Arial.ttf";

function usage() {
  return [
    "Usage: node src/build-demo-video.js <feed.json> <output.mp4> [--now <iso-date>]",
    "",
    "Requires ImageMagick `magick` and `ffmpeg` on PATH.",
  ].join("\n");
}

function parseArgs(argv) {
  const [feedPath, outputPath, ...rest] = argv;
  if (!feedPath || !outputPath) {
    throw new Error(usage());
  }

  let now = DEFAULT_NOW;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === "--now") {
      now = rest[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${rest[i]}\n\n${usage()}`);
    }
  }

  return { feedPath, outputPath, now };
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapWords(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function textBlock(lines, x, y, options = {}) {
  const {
    size = 32,
    fill = "#f6f1e8",
    weight = 500,
    lineHeight = Math.round(size * 1.32),
    family = "Arial",
  } = options;

  return lines
    .map((line, index) => {
      const dy = y + index * lineHeight;
      return `<text x="${x}" y="${dy}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`;
    })
    .join("\n");
}

function pill(label, x, y, fill = "#1f251d", stroke = "#7dde92") {
  return [
    `<rect x="${x}" y="${y}" width="270" height="62" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`,
    `<text x="${x + 22}" y="${y + 39}" font-family="Arial" font-size="20" fill="${stroke}">${escapeXml(label)}</text>`,
  ].join("\n");
}

function metric(label, value, x, y, accent = "#7dde92") {
  return [
    `<rect x="${x}" y="${y}" width="252" height="126" rx="8" fill="#151914" stroke="#30362f" stroke-width="2"/>`,
    `<text x="${x + 22}" y="${y + 38}" font-family="Arial" font-size="18" fill="#a9b2a6">${escapeXml(label.toUpperCase())}</text>`,
    `<text x="${x + 22}" y="${y + 91}" font-family="Arial" font-size="46" font-weight="700" fill="${accent}">${escapeXml(value)}</text>`,
  ].join("\n");
}

function probabilityBar(label, probability, move, x, y) {
  const width = 610;
  const pct = Math.max(0, Math.min(100, probability * 100));
  return [
    `<text x="${x}" y="${y}" font-family="Arial" font-size="26" fill="#f6f1e8">${escapeXml(label)}</text>`,
    `<rect x="${x + 180}" y="${y - 22}" width="${width}" height="18" rx="4" fill="#242a22"/>`,
    `<rect x="${x + 180}" y="${y - 22}" width="${Math.round((width * pct) / 100)}" height="18" rx="4" fill="#7dd3fc"/>`,
    `<text x="${x + 820}" y="${y}" font-family="Arial" font-size="22" fill="#a9b2a6">${pct.toFixed(2)}% / ${move >= 0 ? "+" : ""}${move.toFixed(2)} pts</text>`,
  ].join("\n");
}

function slideShell({ eyebrow, title, body = [], content = "", footer = "" }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0c130e"/>
      <stop offset="52%" stop-color="#090c09"/>
      <stop offset="100%" stop-color="#101326"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <circle cx="1080" cy="40" r="260" fill="#799cff" opacity="0.12"/>
  <circle cx="80" cy="700" r="330" fill="#7dde92" opacity="0.10"/>
  <rect x="56" y="52" width="1168" height="616" rx="20" fill="#0f120e" opacity="0.82" stroke="#30362f" stroke-width="2"/>
  <text x="88" y="106" font-family="Arial" font-size="18" fill="#7dde92">${escapeXml(eyebrow)}</text>
  ${textBlock(wrapWords(title, 32), 88, 170, { size: 58, weight: 800, family: "Arial", lineHeight: 64 })}
  ${textBlock(body.flatMap((line) => wrapWords(line, 86)), 92, 300, { size: 25, fill: "#cdd6ca", lineHeight: 38 })}
  ${content}
  <text x="88" y="640" font-family="Arial" font-size="18" fill="#a9b2a6">${escapeXml(footer)}</text>
</svg>`;
}

function topFlags(report) {
  return report.flags.slice(0, 5).map((flag) => `${flag.severity.toUpperCase()} / ${flag.code}: ${flag.detail}`);
}

function riskState(report) {
  if (report.riskScore >= 30) return "elevated";
  if (report.riskScore >= 12) return "watch";
  return "normal";
}

function buildSlides(report, now) {
  const firstMarket = report.markets[0];
  const secondMarket = report.markets[1] ?? report.markets[0];

  return [
    slideShell({
      eyebrow: "TXODDS WORLD CUP HACKATHON",
      title: "World Cup odds integrity watch",
      body: [
        "A keyless public MVP that turns replayable fixture-shaped odds data into risk signals for judges.",
        "No wallet connection, paid subscription, private key, seed phrase, or live API token is required for this demo.",
      ],
      content: [
        pill("LIVE MVP", 92, 454),
        pill("PUBLIC REPO", 392, 454, "#151914", "#7dd3fc"),
        pill("DEMO DATA MODE", 692, 454, "#151914", "#f6c85f"),
      ].join("\n"),
      footer: "https://txodds-worldcup-sentinel.vercel.app",
    }),
    slideShell({
      eyebrow: "REPORT SUMMARY",
      title: "Elevated risk in a compact review surface",
      body: ["The MVP ranks suspicious feed and market states before a trader, operator, or fan-facing app trusts the tape."],
      content: [
        metric("risk state", riskState(report), 92, 390, "#f6c85f"),
        metric("risk score", String(report.riskScore), 366, 390, "#7dde92"),
        metric("markets", String(report.marketCount), 640, 390, "#7dd3fc"),
        metric("flags", String(report.flagCount), 914, 390, "#ff6b5e"),
      ].join("\n"),
      footer: `Generated at ${now}`,
    }),
    slideShell({
      eyebrow: "RANKED SIGNALS",
      title: "The highest-risk rows are surfaced first",
      content: textBlock(topFlags(report).flatMap((line) => wrapWords(line, 74)), 92, 300, {
        size: 24,
        fill: "#f6f1e8",
        lineHeight: 36,
        family: "Arial",
      }),
      footer: "Signals include event mismatch, large odds move, settlement drift, and stale feed checks.",
    }),
    slideShell({
      eyebrow: "MARKET TAPE",
      title: firstMarket ? firstMarket.matchId : "Market review",
      body: firstMarket ? [`${firstMarket.name} / ${firstMarket.provider} / ${firstMarket.ageMinutes}m source age`] : [],
      content: firstMarket
        ? firstMarket.selections
            .map((selection, index) =>
              probabilityBar(
                selection.name,
                selection.impliedProbability,
                selection.probabilityDeltaPctPoints,
                110,
                390 + index * 58,
              ),
            )
            .join("\n")
        : "",
      footer: "Selections keep odds, implied probability, and movement visible for judge review.",
    }),
    slideShell({
      eyebrow: "SETTLEMENT CHECK",
      title: secondMarket ? secondMarket.matchId : "Settlement drift",
      body: [
        "The analyzer compares event state, settlement state, source age, implied probabilities, and external reference drift.",
      ],
      content: textBlock(
        (secondMarket?.flags ?? []).slice(0, 6).flatMap((flag) => wrapWords(`- ${flag.code}: ${flag.detail}`, 82)),
        110,
        385,
        { size: 25, fill: "#f6f1e8", lineHeight: 39 },
      ),
      footer: "Finished events with open settlement are promoted to high severity.",
    }),
    slideShell({
      eyebrow: "NEXT ADAPTER",
      title: "Live TxODDS data can use the same feed shape",
      body: [
        "The current MVP is intentionally replayable demo-data mode.",
        "A live TxODDS adapter can write the same fixture feed once a safe API-token route exists, without changing the analyzer or tests.",
      ],
      content: textBlock(
        [
          "Live MVP: https://txodds-worldcup-sentinel.vercel.app",
          "Repo: https://github.com/chico10117/txodds-worldcup-sentinel",
          "Validation: npm test && npm run build",
        ],
        108,
        470,
        { size: 24, fill: "#7dd3fc", lineHeight: 40, family: "Arial" },
      ),
      footer: "No custody, no wallet signing, and no judge-side fees in the public MVP.",
    }),
  ];
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const { feedPath, outputPath, now } = parseArgs(process.argv.slice(2));
  const feed = JSON.parse(await readFile(feedPath, "utf8"));
  const report = analyzeFeed(feed, { now });
  const outputDir = path.dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  const workDir = await mkdtemp(path.join(tmpdir(), "txodds-video-"));
  try {
    const slides = buildSlides(report, now);
    const pngs = [];
    for (let index = 0; index < slides.length; index += 1) {
      const id = String(index).padStart(2, "0");
      const svgPath = path.join(workDir, `frame-${id}.svg`);
      const pngPath = path.join(workDir, `frame-${id}.png`);
      await writeFile(svgPath, slides[index], "utf8");
      await run("magick", ["-font", FONT_FILE, svgPath, pngPath]);
      pngs.push(pngPath);
    }

    const concatPath = path.join(workDir, "concat.txt");
    const concatLines = pngs.flatMap((pngPath) => [`file '${pngPath}'`, "duration 10"]);
    concatLines.push(`file '${pngs.at(-1)}'`);
    await writeFile(concatPath, `${concatLines.join("\n")}\n`, "utf8");

    await run("ffmpeg", [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatPath,
      "-vf",
      "format=yuv420p",
      "-r",
      "30",
      "-movflags",
      "+faststart",
      outputPath,
    ]);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  console.log(JSON.stringify({ ok: true, outputPath }));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
