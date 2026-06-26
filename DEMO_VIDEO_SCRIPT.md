# Demo Video Script

Target length: 60 to 90 seconds.

## Shot List

1. Open `https://txodds-worldcup-sentinel.vercel.app`.
2. Show the headline, risk state, risk score, market count, and flag count.
3. Scroll to the ranked signals table.
4. Highlight `EVENT_MARKET_MISMATCH`, `LARGE_ODDS_MOVE`, `SETTLEMENT_DRIFT`, and `STALE_FEED`.
5. Scroll to the market tape and show implied-probability bars plus movement columns.
6. End on the footer that states demo-data mode and no wallet/API-key requirement.

## Voiceover

```text
This is TxODDS World Cup Sentinel, a keyless integrity monitor for World Cup odds and event data.

The demo uses replayable fixture data, so judges can evaluate it without connecting a wallet, buying tokens, or handling API credentials.

The analyzer converts decimal odds into implied probabilities, computes overround, detects large probability moves, checks stale feed age, and flags event-settlement mismatches.

The ranked signal table prioritizes the highest-risk rows first. Here, a finished France versus Germany event still has open settlement status, while several markets show unusually large odds movement and settlement drift against an external reference.

The market tape keeps the raw review surface visible: selections, odds, implied probability, probability bars, movement, source age, and detected flags.

The current version is intentionally demo-data mode. A live TxODDS adapter can write the same feed shape once a safe API-token route is available, without changing the analyzer or tests.
```
