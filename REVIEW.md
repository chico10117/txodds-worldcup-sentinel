# Judge Review Checklist

Use this checklist to review TxODDS World Cup Sentinel quickly without wallet
setup, API keys, paid access, or live network calls.

## Five-Minute Path

1. Open the live MVP:
   `https://txodds-worldcup-sentinel.vercel.app`
2. Open the judge brief:
   `https://txodds-worldcup-sentinel.vercel.app/judge-brief.html`
3. Watch the browser-playable demo:
   `https://txodds-worldcup-sentinel.vercel.app/demo-video.html`
4. Inspect the machine-readable reports:
   `https://txodds-worldcup-sentinel.vercel.app/report.json` and
   `https://txodds-worldcup-sentinel.vercel.app/txodds-capture-report.json`
5. Confirm replay evidence and artifact hashes:
   `https://txodds-worldcup-sentinel.vercel.app/replay-manifest.json`

## What To Verify

- Odds integrity: stale source updates, large odds movement, overround
  anomalies, implied probability drift, and finished-event/open-settlement
  mismatches are visible in the report.
- TxODDS-shaped input boundary: `src/normalize-txodds.js` converts captured
  `events`, `fixtures`, or `matches` payloads into the same analyzer feed shape.
- Judge playground: `judge-playground.html` runs the analyzer locally in the
  browser from pasted JSON, without upload or external API calls.
- Repeatability: `npm test`, `npm run build`, `npm run build:video`,
  `npm run report:txodds`, and `npm run verify:packet` rebuild and validate the
  public packet.
- Safety: the public MVP does not ask for a wallet, private key, seed phrase,
  subscription, API token, or judge-side payment.

## Hackathon Fit

- Public MVP: static Vercel site with rendered dashboard, reports, replay
  manifest, demo video page, judge brief, compliance page, and playground.
- Prediction-market utility: flags odds and settlement states that should be
  reviewed before a trading or settlement agent trusts an event feed.
- TxODDS integration path: live TxODDS calls are intentionally excluded until a
  safe user-controlled API-token route exists; the captured-payload normalizer
  is the adapter boundary that keeps live data integration scoped.
- Reviewability: every public artifact has a no-wallet review path so judges can
  evaluate the core analyzer even before live API access is available.

## Known Boundary

This submission is intentionally demo-data mode. It proves the analyzer,
renderer, report shape, replay path, browser playground, and TxODDS-shaped
normalization boundary. It does not claim live TxODDS API access, wallet
activation, paid subscription access, or on-chain settlement integration.
