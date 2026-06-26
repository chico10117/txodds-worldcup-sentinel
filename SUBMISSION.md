# TxODDS World Cup Sentinel Submission Packet

## Superteam Fields

Live MVP:

```text
https://txodds-worldcup-sentinel.vercel.app
```

Public repository:

```text
https://github.com/chico10117/txodds-worldcup-sentinel
```

Judge brief:

```text
https://txodds-worldcup-sentinel.vercel.app/judge-brief.html
```

Hackathon compliance note:

```text
https://txodds-worldcup-sentinel.vercel.app/compliance.html
```

Demo video:

```text
https://txodds-worldcup-sentinel.vercel.app/demo-video.html
```

Judge playground:

```text
https://txodds-worldcup-sentinel.vercel.app/judge-playground.html
```

AI-readable review manifest:

```text
https://txodds-worldcup-sentinel.vercel.app/.well-known/ai.txt
```

Raw demo MP4:

```text
https://github.com/chico10117/txodds-worldcup-sentinel/blob/main/media/demo.mp4
```

Project name:

```text
TxODDS World Cup Sentinel
```

Short description:

```text
A replayable World Cup odds integrity monitor that turns fixture-shaped TxODDS data into judge-readable risk signals and deterministic agent actions for stale feeds, odds shocks, overround anomalies, settlement drift, and finished-event/open-settlement mismatches.
```

Anything else:

```text
The current public MVP intentionally runs in demo-data mode so judges can review it without a wallet, payment, subscription, private key, seed phrase, or TxODDS API token.

Review path:
- Judge brief: https://txodds-worldcup-sentinel.vercel.app/judge-brief.html
- Live MVP: https://txodds-worldcup-sentinel.vercel.app
- Browser-playable demo video: https://txodds-worldcup-sentinel.vercel.app/demo-video.html
- Paste-in judge playground: https://txodds-worldcup-sentinel.vercel.app/judge-playground.html
- Hackathon compliance note: https://txodds-worldcup-sentinel.vercel.app/compliance.html
- AI-readable review manifest: https://txodds-worldcup-sentinel.vercel.app/.well-known/ai.txt
- Replay manifest: https://txodds-worldcup-sentinel.vercel.app/replay-manifest.json
- Fixture report JSON: https://txodds-worldcup-sentinel.vercel.app/report.json
- Captured TxODDS-shaped report JSON: https://txodds-worldcup-sentinel.vercel.app/txodds-capture-report.json
- Public repo and technical packet: https://github.com/chico10117/txodds-worldcup-sentinel/blob/main/SUBMISSION.md
- Judge review checklist: https://github.com/chico10117/txodds-worldcup-sentinel/blob/main/REVIEW.md
- Public CI workflow: https://github.com/chico10117/txodds-worldcup-sentinel/actions/workflows/verify.yml
- Raw MP4 fallback: https://github.com/chico10117/txodds-worldcup-sentinel/blob/main/media/demo.mp4

The analyzer includes an offline captured-payload normalizer for TxODDS-shaped JSON. The judge playground runs locally in the browser from static JavaScript and does not upload pasted data or call external APIs. A live TxODDS adapter can be added once a safe API-token route is available, while keeping the analyzer and test surface unchanged.
```

## Status

- Live public static MVP exists.
- Public repository exists.
- Analyzer, captured TxODDS payload normalizer, and static renderer are
  dependency-free Node scripts.
- Public machine-readable reports are generated at `/report.json` and
  `/txodds-capture-report.json` for direct judge inspection, including a
  deterministic audit summary, recommended agent actions, and automation
  readiness gates derived from the ranked flags.
- A public judge evaluation brief is generated at `/judge-brief.html` with the
  fixture report, captured TxODDS report, replay path, and safety posture on one
  static page.
- A public hackathon compliance note is generated at `/compliance.html` to make
  the no-wallet, no-account, no-token judge review path explicit.
- A public browser-playable demo video page is generated at `/demo-video.html`.
- A public paste-in judge playground is generated at `/judge-playground.html`
  so reviewers can paste captured TxODDS-shaped JSON and run the analyzer
  locally in the browser without wallet, token, or network access.
- A public replay manifest is generated at `/replay-manifest.json` with public
  links, validation commands, report summaries, SHA-256 artifact hashes, and
  the no-private-key/no-token safety posture.
- An AI-readable public review manifest is available at `/.well-known/ai.txt`
  so crawlers and agent reviewers can discover the review path, safety posture,
  replay commands, and machine-readable reports.
- A judge review checklist exists in `REVIEW.md` to map the live MVP, public
  artifacts, safety posture, and known live-API boundary into a short review
  path.
- A local public-packet verifier exists at `src/verify-packet.js` and is exposed
  as `npm run verify:packet` after `npm run build`.
- A public GitHub Actions workflow exists at `.github/workflows/verify.yml` and
  runs `npm run verify:ci` plus replay-manifest invariants on pushes, pull
  requests, and manual dispatch.
- Captioned demo video exists at `media/demo.mp4`.
- Demo video recording plan exists in `DEMO_VIDEO_SCRIPT.md`.
- Live TxODDS network calls are intentionally not included until a safe
  wallet/API-token path exists. The repo now includes an offline captured-payload
  boundary (`src/normalize-txodds.js`) so TxODDS-shaped JSON can be analyzed
  without private keys, API tokens, or external calls.

## Validation Commands

```sh
npm test
npm run build
npm run build:video
npm run report:txodds
npm run verify:packet
npm run verify:ci
jq '{project, mode, commands, artifactCount:(.artifacts|length), safety}' public/replay-manifest.json
jq '{urls, safety}' public/replay-manifest.json
node src/cli.js fixtures/sample-worldcup-feed.json --now 2026-06-26T06:20:00.000Z
node src/cli.js fixtures/sample-txodds-capture.json --input-format txodds --now 2026-06-26T06:20:00.000Z
```
