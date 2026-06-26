import test from "node:test";
import assert from "node:assert/strict";
import { analyzeFeed } from "../src/analyze.js";
import { escapeHtml, renderDemoVideoHtml, renderReportHtml } from "../src/render-html.js";

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

  const html = renderReportHtml(report);
  assert.match(html, /World Cup odds integrity watch/);
  assert.match(html, /EVENT_MARKET_MISMATCH/);
  assert.match(html, /report\.json/);
  assert.match(html, /txodds-capture-report\.json/);
  assert.match(html, /replay-manifest\.json/);
  assert.match(html, /demo-video\.html/);
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
  assert.match(html, /does not request wallet connection/);
});
