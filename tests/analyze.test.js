import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeFeed,
  impliedProbability,
  marketOverround,
  minutesBetween,
  pctPoints
} from "../src/analyze.js";

test("computes implied probability from decimal odds", () => {
  assert.equal(impliedProbability(2), 0.5);
  assert.equal(pctPoints(impliedProbability(4)), 25);
});

test("computes market overround from selections", () => {
  const overround = marketOverround([
    { name: "home", odds: 2 },
    { name: "draw", odds: 3 },
    { name: "away", odds: 6 }
  ]);

  assert.equal(pctPoints(overround), 0);
});

test("computes elapsed minutes between feed updates", () => {
  assert.equal(
    minutesBetween("2026-06-26T05:45:00.000Z", "2026-06-26T06:00:00.000Z"),
    15
  );
});

test("flags stale markets, large movement, and overround outliers", () => {
  const report = analyzeFeed(
    {
      generatedAt: "2026-06-26T06:00:00.000Z",
      matches: [
        {
          id: "match-1",
          status: "not_started",
          eventState: { phase: "pre_match" },
          markets: [
            {
              id: "winner",
              name: "Winner",
              provider: "fixture",
              lastUpdated: "2026-06-26T05:20:00.000Z",
              selections: [
                { name: "Home", odds: 1.3, previousOdds: 2.5 },
                { name: "Away", odds: 1.7, previousOdds: 1.8 }
              ]
            }
          ]
        }
      ]
    },
    { now: "2026-06-26T06:00:00.000Z", staleMinutes: 15 }
  );

  assert.equal(report.matchCount, 1);
  assert.equal(report.marketCount, 1);
  assert.ok(report.flags.some((flag) => flag.code === "STALE_FEED"));
  assert.ok(report.flags.some((flag) => flag.code === "LARGE_ODDS_MOVE"));
  assert.ok(report.flags.some((flag) => flag.code === "OVERROUND_OUTLIER"));
});

test("flags finished events whose external settlement is still open", () => {
  const report = analyzeFeed(
    {
      generatedAt: "2026-06-26T06:00:00.000Z",
      matches: [
        {
          id: "match-2",
          status: "finished",
          eventState: { phase: "finished", lastEventAt: "2026-06-26T05:40:00.000Z" },
          markets: [
            {
              id: "winner",
              name: "Winner",
              provider: "fixture",
              lastUpdated: "2026-06-26T05:59:00.000Z",
              selections: [
                { name: "Home", odds: 1.2 },
                { name: "Draw", odds: 8 },
                { name: "Away", odds: 12 }
              ],
              externalSettlement: {
                status: "open",
                implied: {
                  Home: 0.98,
                  Draw: 0.01,
                  Away: 0.01
                }
              }
            }
          ]
        }
      ]
    },
    { now: "2026-06-26T06:00:00.000Z" }
  );

  assert.ok(report.flags.some((flag) => flag.code === "EVENT_MARKET_MISMATCH"));
  assert.equal(report.markets[0].settlementLagMinutes, 20);
  assert.match(
    report.flags.find((flag) => flag.code === "EVENT_MARKET_MISMATCH").detail,
    /event finished 20 minutes ago/
  );
  assert.ok(report.flags.some((flag) => flag.code === "SETTLEMENT_DRIFT"));
  assert.ok(report.riskScore > 0);
  assert.equal(report.automationReadiness.state, "blocked");
  assert.equal(report.automationReadiness.checks.settlementReady, false);
  assert.equal(report.automationReadiness.checks.tradingReady, false);
  assert.equal(report.automationReadiness.marketCounts.blocked, 1);
  assert.deepEqual(report.automationReadiness.blockingFlagCodes, [
    "EVENT_MARKET_MISMATCH",
    "SETTLEMENT_DRIFT"
  ]);
  assert.equal(report.riskSummary.highestSeverity, "high");
  assert.equal(report.riskSummary.marketsWithFlags, 1);
  assert.equal(report.riskSummary.blockedMarkets, 1);
  assert.equal(report.riskSummary.maxSettlementLagMinutes, 20);
  assert.equal(report.riskSummary.flagCounts.EVENT_MARKET_MISMATCH, 1);
});

test("builds deterministic recommended agent actions from flags", () => {
  const report = analyzeFeed(
    {
      generatedAt: "2026-06-26T06:00:00.000Z",
      matches: [
        {
          id: "match-3",
          status: "finished",
          eventState: { phase: "finished" },
          markets: [
            {
              id: "winner",
              name: "Winner",
              provider: "fixture",
              lastUpdated: "2026-06-26T05:20:00.000Z",
              selections: [
                { name: "Home", odds: 1.2, previousOdds: 2.2 },
                { name: "Draw", odds: 8, previousOdds: 4 },
                { name: "Away", odds: 12, previousOdds: 3 }
              ],
              externalSettlement: {
                status: "open",
                implied: {
                  Home: 0.98,
                  Draw: 0.01,
                  Away: 0.01
                }
              }
            }
          ]
        }
      ]
    },
    { now: "2026-06-26T06:00:00.000Z" }
  );

  assert.ok(report.recommendedActionCount >= 4);
  assert.deepEqual(
    report.recommendedActions.slice(0, 3).map((action) => action.code),
    ["EVENT_MARKET_MISMATCH", "SETTLEMENT_DRIFT", "LARGE_ODDS_MOVE"]
  );
  assert.equal(report.recommendedActions[0].title, "Pause settlement automation");
  assert.deepEqual(report.recommendedActions[0].matches, ["match-3"]);
  assert.equal(report.riskSummary.maxAbsProbabilityMovePctPoints, 37.88);
  assert.deepEqual(report.riskSummary.primaryBlockingFlagCodes, [
    "EVENT_MARKET_MISMATCH",
    "LARGE_ODDS_MOVE",
    "SETTLEMENT_DRIFT"
  ]);
});

test("marks clean reports ready for automated read-only decisions", () => {
  const report = analyzeFeed(
    {
      generatedAt: "2026-06-26T06:00:00.000Z",
      matches: [
        {
          id: "match-4",
          status: "not_started",
          eventState: { phase: "pre_match" },
          markets: [
            {
              id: "winner",
              name: "Winner",
              provider: "fixture",
              lastUpdated: "2026-06-26T05:59:00.000Z",
              selections: [
                { name: "Home", odds: 2 },
                { name: "Draw", odds: 4 },
                { name: "Away", odds: 4 }
              ]
            }
          ]
        }
      ]
    },
    { now: "2026-06-26T06:00:00.000Z" }
  );

  assert.equal(report.flagCount, 0);
  assert.equal(report.automationReadiness.state, "ready");
  assert.equal(report.automationReadiness.checks.settlementReady, true);
  assert.equal(report.automationReadiness.checks.tradingReady, true);
  assert.equal(report.automationReadiness.checks.quotingReady, true);
  assert.equal(report.automationReadiness.checks.requiresHumanReview, false);
  assert.equal(report.automationReadiness.marketCounts.ready, 1);
  assert.equal(report.riskSummary.highestSeverity, "low");
  assert.equal(report.riskSummary.marketsWithFlags, 0);
  assert.equal(report.riskSummary.readyMarkets, 1);
  assert.deepEqual(report.riskSummary.flagCounts, {});
});
