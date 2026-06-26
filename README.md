# TxODDS World Cup Sentinel

Keyless local prototype for the Superteam / TxODDS World Cup hackathon lead.

This is a fixture-driven odds and event sentinel. It does not call TxODDS,
Solana RPC, mainnet, testnet, or any external API. It exists to make the MVP
shape testable before a safe API-token route is available.

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
npm run report
npm run build:demo
node src/cli.js fixtures/sample-worldcup-feed.json --now 2026-06-26T06:20:00.000Z
```

The CLI prints a JSON report with market summaries, ranked flags, and a simple
risk score. The demo build writes `public/index.html`, a static demo-data report
that can be deployed without a backend.

## Live API Boundary

The hackathon docs say TxODDS World Cup API activation requires a Solana wallet
signature and on-chain subscription transaction. Do not put private keys, seed
phrases, or API tokens in this repo.

When a safe token path exists, add an adapter that writes the same feed shape as
`fixtures/sample-worldcup-feed.json`, then keep the analyzer and tests unchanged.

## Hackathon Fit

This can become the analysis core for a public MVP:

- A trading-agent dashboard that explains odds movement and risk-adjusted
  actions without custody.
- A settlement-risk monitor comparing TxODDS event state with prediction-market
  settlement state.
- A fan-facing World Cup odds explainer with replayable fixture data and source
  links.

It is not submission-ready by itself. A viable entry still needs a public demo,
demo video, public repository, and safe live-data integration or clearly labeled
demo-data mode.

## Public Demo

Current Vercel deployment:

```text
https://txodds-worldcup-sentinel.vercel.app
```

Deployment uses `vercel.json` to run `npm run build` and serve `public/`.
