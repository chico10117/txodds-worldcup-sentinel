import test from "node:test";
import assert from "node:assert/strict";
import { analyzeFeed } from "../src/analyze.js";
import {
  escapeHtml,
  renderComplianceHtml,
  renderDemoVideoHtml,
  renderJudgeBriefHtml,
  renderPlaygroundHtml,
  renderReportHtml
} from "../src/render-html.js";

test("escapes html-sensitive characters", () => {
  assert.equal(
    escapeHtml(`<script>"x" & 'y'</script>`),
    "&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;"
  );
});

test("renders a deterministic static demo report", () => {
  const report = analyzeFeed(
    {
      generatedAt: "2026-06-26T06:00:00.000Z",
      serviceLevelId: 1,
      matches: [
        {
          id: "unsafe-<match>",
          status: "finished",
          eventState: { phase: "finished", lastEventAt: "2026-06-26T05:10:00.000Z" },
          markets: [
            {
              id: "winner",
              name: "Winner",
              provider: "fixture",
              lastUpdated: "2026-06-26T05:30:00.000Z",
              selections: [
                { name: "Home", odds: 1.4, previousOdds: 2.2 },
                { name: "Draw", odds: 5.2, previousOdds: 3.5 },
                { name: "Away", odds: 7.8, previousOdds: 3.1 }
              ],
              externalSettlement: {
                status: "open",
                implied: {
                  Home: 0.95,
                  Draw: 0.02,
                  Away: 0.03
                }
              }
            }
          ]
        }
      ]
    },
    {
      now: "2026-06-26T06:20:00.000Z",
      generatedAt: "2026-06-26T06:20:00.000Z"
    }
  );

  const html = renderReportHtml(report);
  assert.match(html, /World Cup odds integrity watch/);
  assert.match(html, /EVENT_MARKET_MISMATCH/);
  assert.match(html, /70m settlement lag/);
  assert.match(html, /What an automated strategy should do/);
  assert.match(html, /Pause settlement automation/);
  assert.match(html, /Automation gate/);
  assert.match(html, /Can an agent act on this snapshot\?/);
  assert.match(html, /Do not automate settlement, trading, or quoting/);
  assert.match(html, /report\.json/);
  assert.match(html, /txodds-capture-report\.json/);
  assert.match(html, /replay-manifest\.json/);
  assert.match(html, /demo-video\.html/);
  assert.match(html, /judge-playground\.html/);
  assert.match(html, /judge-brief\.html/);
  assert.match(html, /compliance\.html/);
  assert.match(html, /\.well-known\/ai\.txt/);
  assert.match(html, /unsafe-&lt;match&gt;/);
  assert.doesNotMatch(html, /unsafe-<match>/);
});

test("renders a directly playable demo video page", () => {
  const report = analyzeFeed(
    {
      generatedAt: "2026-06-26T06:00:00.000Z",
      serviceLevelId: 1,
      matches: []
    },
    {
      now: "2026-06-26T06:20:00.000Z",
      generatedAt: "2026-06-26T06:20:00.000Z"
    }
  );

  const html = renderDemoVideoHtml(report);
  assert.match(html, /Demo video for judge review/);
  assert.match(
    html,
    /raw\.githubusercontent\.com\/chico10117\/txodds-worldcup-sentinel\/main\/media\/demo\.mp4/
  );
  assert.match(html, /replay-manifest\.json/);
  assert.match(html, /judge-brief\.html/);
  assert.match(html, /compliance\.html/);
  assert.match(html, /does not request wallet connection/);
});

test("renders a hackathon compliance note without wallet requirements", () => {
  const report = analyzeFeed(
    {
      generatedAt: "2026-06-26T06:00:00.000Z",
      serviceLevelId: 1,
      matches: []
    },
    {
      now: "2026-06-26T06:20:00.000Z",
      generatedAt: "2026-06-26T06:20:00.000Z"
    }
  );

  const html = renderComplianceHtml(report);
  assert.match(html, /Reviewable without wallet or account setup/);
  assert.match(html, /without buying software/);
  assert.match(html, /Wallet required/);
  assert.match(html, /Hackathon terms/);
  assert.match(html, /judge-playground\.html/);
  assert.match(html, /replay-manifest\.json/);
});

test("renders a browser-only judge playground with escaped sample payload", () => {
  const html = renderPlaygroundHtml({
    capturedAt: "2026-06-26T06:00:00.000Z",
    events: [
      {
        eventId: "unsafe-<event>",
        markets: []
      }
    ]
  });

  assert.match(html, /Paste captured TxODDS JSON/);
  assert.match(html, /Run local analysis/);
  assert.match(html, /playground\.js/);
  assert.match(html, /Automation gate/);
  assert.match(html, /does not connect a wallet/);
  assert.match(html, /judge-brief\.html/);
  assert.match(html, /compliance\.html/);
  assert.match(html, /unsafe-\\u003cevent>/);
  assert.doesNotMatch(html, /unsafe-<event>/);
});

test("renders a judge evaluation brief with escaped report data", () => {
  const fixtureReport = analyzeFeed(
    {
      generatedAt: "2026-06-26T06:00:00.000Z",
      serviceLevelId: 1,
      matches: [
        {
          id: "fixture-<match>",
          status: "finished",
          eventState: { phase: "finished" },
          markets: [
            {
              id: "winner",
              name: "Winner",
              provider: "fixture",
              lastUpdated: "2026-06-26T05:30:00.000Z",
              selections: [
                { name: "Home", odds: 1.4, previousOdds: 2.2 },
                { name: "Draw", odds: 5.2, previousOdds: 3.5 },
                { name: "Away", odds: 7.8, previousOdds: 3.1 }
              ],
              externalSettlement: {
                status: "open",
                implied: {
                  Home: 0.95,
                  Draw: 0.02,
                  Away: 0.03
                }
              }
            }
          ]
        }
      ]
    },
    {
      now: "2026-06-26T06:20:00.000Z",
      generatedAt: "2026-06-26T06:20:00.000Z"
    }
  );
  const txOddsReport = analyzeFeed(
    {
      generatedAt: "2026-06-26T06:00:00.000Z",
      serviceLevelId: 1,
      matches: [
        {
          id: "tx-<capture>",
          status: "scheduled",
          markets: [
            {
              id: "winner",
              name: "Winner",
              provider: "txodds",
              lastUpdated: "2026-06-26T05:50:00.000Z",
              selections: [
                { name: "Home", odds: 2.1, previousOdds: 2.6 },
                { name: "Away", odds: 1.9, previousOdds: 1.8 }
              ]
            }
          ]
        }
      ]
    },
    {
      now: "2026-06-26T06:20:00.000Z",
      generatedAt: "2026-06-26T06:20:00.000Z"
    }
  );

  const html = renderJudgeBriefHtml(fixtureReport, txOddsReport);
  assert.match(html, /Judge evaluation brief/);
  assert.match(html, /Fixture report/);
  assert.match(html, /Captured TxODDS report/);
  assert.match(html, /Strategy guardrails/);
  assert.match(html, /Automation readiness/);
  assert.match(html, /Fixture safety gates/);
  assert.match(html, /Pause settlement automation/);
  assert.match(html, /does not connect a wallet/);
  assert.match(html, /compliance\.html/);
  assert.match(html, /judge-playground\.html/);
  assert.match(html, /replay-manifest\.json/);
  assert.match(html, /\.well-known\/ai\.txt/);
  assert.match(html, /fixture-&lt;match&gt;/);
  assert.match(html, /tx-&lt;capture&gt;/);
  assert.doesNotMatch(html, /fixture-<match>/);
  assert.doesNotMatch(html, /tx-<capture>/);
});
