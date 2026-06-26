import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeFeed } from "../src/analyze.js";
import { normalizeTxOddsPayload } from "../src/normalize-txodds.js";

test("normalizes a captured TxODDS-shaped payload into analyzer feed shape", async () => {
  const payload = JSON.parse(
    await readFile(new URL("../fixtures/sample-txodds-capture.json", import.meta.url), "utf8")
  );
  const feed = normalizeTxOddsPayload(payload);

  assert.equal(feed.serviceLevelId, 1);
  assert.equal(feed.matches.length, 1);
  assert.equal(feed.matches[0].id, "tx-wc-arg-bra-20260627");
  assert.equal(feed.matches[0].home, "Argentina");
  assert.equal(feed.matches[0].markets[0].provider, "txodds-worldcup");
  assert.equal(feed.matches[0].markets[0].selections[0].odds, 2.1);
});

test("analyzes a normalized TxODDS capture without network or token access", async () => {
  const payload = JSON.parse(
    await readFile(new URL("../fixtures/sample-txodds-capture.json", import.meta.url), "utf8")
  );
  const feed = normalizeTxOddsPayload(payload);
  const report = analyzeFeed(feed, { now: "2026-06-26T06:20:00.000Z" });

  assert.equal(report.matchCount, 1);
  assert.equal(report.marketCount, 1);
  assert.ok(report.flags.some((flag) => flag.code === "STALE_FEED"));
  assert.ok(report.flags.some((flag) => flag.code === "LARGE_ODDS_MOVE"));
});

test("rejects captures without recognizable match arrays", () => {
  assert.throws(
    () => normalizeTxOddsPayload({ capturedAt: "2026-06-26T06:00:00.000Z" }),
    /must include one of/
  );
});
