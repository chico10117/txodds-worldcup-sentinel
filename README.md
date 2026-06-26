# TxODDS World Cup Sentinel

Keyless local prototype for the Superteam / TxODDS World Cup hackathon lead.

This is a fixture-driven odds and event sentinel with a safe captured-payload
adapter boundary. It does not call TxODDS, Solana RPC, mainnet, testnet, or any
external API. It exists to make the MVP shape testable before a safe API-token
route is available.

## What It Checks

- Implied probabilities from decimal odds.
- Market overround outliers.
- Large implied-probability movement from previous odds.
- Stale feed updates.
- Finished-event versus still-open settlement mismatches.
- Drift between TxODDS-style implied probability and an external market source.

## Run

```sh
npm test
npm run build
npm run build:video
npm run report
npm run report:txodds
npm run verify:packet
npm run verify:ci
npm run build:demo
node src/cli.js fixtures/sample-worldcup-feed.json --now 2026-06-26T06:20:00.000Z
node src/cli.js fixtures/sample-txodds-capture.json --input-format txodds --now 2026-06-26T06:20:00.000Z
```

The CLI prints a JSON report with market summaries, ranked flags, and a simple
risk score. The demo build writes `public/index.html`,
`public/judge-brief.html`, `public/compliance.html`, `public/demo-video.html`,
`public/judge-playground.html`, `public/report.json`,
`public/txodds-capture-report.json`, and `public/replay-manifest.json` so judges
can inspect the rendered report, one-page evaluation brief, no-wallet
compliance note, captioned video, paste captured TxODDS-shaped JSON into a
browser-only analyzer, review
machine-readable analyzer output, replay commands, artifact hashes, and safety
assumptions without a backend.

After `npm run build`, `npm run verify:packet` checks the generated public
packet for expected report summaries, required review artifacts, manifest
safety flags, and browser-playground no-network/no-storage constraints.
`npm run verify:ci` runs the public CI path used by GitHub Actions: tests,
static build, packet verification, and syntax checks for the manifest builder,
packet verifier, and generated browser runtime.

## Live API Boundary

The hackathon docs say TxODDS World Cup API activation requires a Solana wallet
signature and on-chain subscription transaction. Do not put private keys, seed
phrases, or API tokens in this repo.

When a safe token path exists, add an adapter that writes the same feed shape as
`fixtures/sample-worldcup-feed.json`, then keep the analyzer and tests unchanged.
For pre-token review, `src/normalize-txodds.js` can normalize a captured
TxODDS-shaped JSON payload from `events`, `fixtures`, or `matches` arrays into
the analyzer feed shape. This supports offline judge/demo review without
committing API tokens or making live network calls.

## Hackathon Fit

This can become the analysis core for a public MVP:

- A trading-agent dashboard that explains odds movement and risk-adjusted
  actions without custody.
- A settlement-risk monitor comparing TxODDS event state with prediction-market
  settlement state.
- A fan-facing World Cup odds explainer with replayable fixture data and source
  links.

The public packet is ready for demo-data-mode framing. A live-data submission
still needs a safe TxODDS API-token route.

## Judge Quickstart

For a fast review path, use `REVIEW.md` first. It maps the live MVP, judge
brief, reports, replay manifest, compliance note, browser playground, and known
live-API boundary into a five-minute checklist.

## Public Demo

Current Vercel deployment:

```text
https://txodds-worldcup-sentinel.vercel.app
https://txodds-worldcup-sentinel.vercel.app/judge-brief.html
https://txodds-worldcup-sentinel.vercel.app/compliance.html
https://txodds-worldcup-sentinel.vercel.app/demo-video.html
https://txodds-worldcup-sentinel.vercel.app/judge-playground.html
```

Deployment uses `vercel.json` to run `npm run build` and serve `public/`.

Machine-readable public reports:

```text
https://txodds-worldcup-sentinel.vercel.app/report.json
https://txodds-worldcup-sentinel.vercel.app/txodds-capture-report.json
https://txodds-worldcup-sentinel.vercel.app/replay-manifest.json
```

The replay manifest records the public URLs, validation commands, report
summaries, SHA-256 hashes for the generated outputs and key source files,
review checklist, verifier, GitHub Actions workflow, and the
no-private-key/no-token/no-network-call safety posture.

The judge brief summarizes the fixture report, captured TxODDS report, replay
path, and safety posture in a single static page for fast review.

The compliance note summarizes why the public packet is intentionally
self-contained for judging: no wallet connection, account setup, subscription,
API token, private key, seed phrase, or live network call is needed to assess
the MVP.

The judge playground runs entirely in the browser from `public/playground.js`.
It accepts pasted TxODDS-shaped JSON and writes results through DOM text nodes,
so reviewers can test the captured-payload boundary without sending data to a
server or exposing wallet/API credentials.

## Public Repository

Current public source repository:

```text
https://github.com/chico10117/txodds-worldcup-sentinel
```

See `SUBMISSION.md` for the Superteam field packet and
`REVIEW.md` for the judge review checklist, plus `DEMO_VIDEO_SCRIPT.md` for the
short demo recording plan.

GitHub Actions runs the same public packet checks on pushes, pull requests, and
manual dispatches:

```text
https://github.com/chico10117/txodds-worldcup-sentinel/actions/workflows/verify.yml
```

## Demo Video

Current captioned demo video:

```text
https://txodds-worldcup-sentinel.vercel.app/demo-video.html
https://github.com/chico10117/txodds-worldcup-sentinel/blob/main/media/demo.mp4
```

The video can be regenerated locally with:

```sh
npm run build:video
```
