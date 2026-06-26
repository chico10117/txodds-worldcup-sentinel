const DEFAULTS = Object.freeze({
  staleMinutes: 15,
  moveThresholdPctPoints: 3,
  settlementDriftPctPoints: 8,
  overroundLowPct: -2,
  overroundHighPct: 12
});

const MATCH_ARRAY_KEYS = ["matches", "events", "fixtures", "games"];
const MARKET_ARRAY_KEYS = ["markets", "odds", "books"];
const SELECTION_ARRAY_KEYS = ["selections", "outcomes", "runners", "prices"];

const payloadInput = document.querySelector("#payload");
const errorNode = document.querySelector("#error");
const rowContainer = document.querySelector("#flag-rows");
const samplePayload = JSON.parse(document.querySelector("#sample-payload").textContent);

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function firstArray(object, keys) {
  for (const key of keys) {
    if (Array.isArray(object?.[key])) {
      return object[key];
    }
  }
  return [];
}

function nestedName(value) {
  if (typeof value === "string") {
    return value;
  }
  return firstDefined(value?.name, value?.displayName, value?.shortName);
}

function slug(value) {
  return String(value ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeStatus(status) {
  const value = String(status ?? "scheduled").toLowerCase();
  if (["final", "finished", "complete", "completed", "settled"].includes(value)) {
    return "finished";
  }
  if (["live", "in_play", "in-play", "running"].includes(value)) {
    return "live";
  }
  return value;
}

function normalizeSettlement(settlement) {
  if (!settlement) {
    return undefined;
  }

  return {
    source: firstDefined(settlement.source, settlement.provider, "capture"),
    status: firstDefined(settlement.status, settlement.state, "unknown"),
    updatedAt: firstDefined(settlement.updatedAt, settlement.lastUpdated, settlement.timestamp, null),
    implied: firstDefined(settlement.implied, settlement.impliedProbabilities, settlement.probabilities, {})
  };
}

function normalizeSelection(selection, context) {
  const name = firstDefined(
    selection.name,
    selection.label,
    selection.outcome,
    selection.selectionName,
    nestedName(selection.team)
  );
  const odds = firstDefined(
    selection.odds,
    selection.decimalOdds,
    selection.price,
    selection.decimal,
    selection.value
  );

  if (!name) {
    throw new Error(`missing selection name in ${context}`);
  }
  if (odds === undefined) {
    throw new Error(`missing decimal odds for ${name} in ${context}`);
  }

  const previousOdds = firstDefined(
    selection.previousOdds,
    selection.previousDecimalOdds,
    selection.previousPrice,
    selection.prevOdds
  );

  return {
    name,
    odds: Number(odds),
    ...(previousOdds === undefined ? {} : { previousOdds: Number(previousOdds) })
  };
}

function normalizeMarket(market, match, payload) {
  const id = firstDefined(market.id, market.marketId, market.key, slug(market.name ?? market.marketName));
  const name = firstDefined(market.name, market.marketName, market.label, id);
  const context = `market ${id}`;
  const settlement = normalizeSettlement(firstDefined(market.externalSettlement, market.settlement));

  return {
    id,
    name,
    provider: firstDefined(market.provider, market.source, payload.source, "txodds-capture"),
    lastUpdated: firstDefined(
      market.lastUpdated,
      market.updatedAt,
      market.timestamp,
      match.updatedAt,
      payload.generatedAt,
      payload.capturedAt
    ),
    selections: firstArray(market, SELECTION_ARRAY_KEYS).map((selection) =>
      normalizeSelection(selection, context)
    ),
    ...(settlement ? { externalSettlement: settlement } : {})
  };
}

function normalizeMatch(match, payload) {
  const home = firstDefined(match.home, nestedName(match.homeTeam), nestedName(match.home_team));
  const away = firstDefined(match.away, nestedName(match.awayTeam), nestedName(match.away_team));
  const kickoff = firstDefined(match.kickoff, match.startTime, match.startsAt, match.scheduledAt);
  const id = firstDefined(
    match.id,
    match.eventId,
    match.fixtureId,
    [home, away, kickoff].filter(Boolean).map(slug).join("-")
  );
  const status = normalizeStatus(firstDefined(match.status, match.phase, match.eventStatus));
  const eventState = match.eventState ?? {
    phase: status,
    score: firstDefined(match.score, null),
    lastEventAt: firstDefined(match.lastEventAt, match.updatedAt, payload.generatedAt, payload.capturedAt)
  };

  return {
    id,
    competition: firstDefined(match.competition, match.league, match.tournament, "World Cup"),
    home,
    away,
    status,
    kickoff,
    eventState,
    markets: firstArray(match, MARKET_ARRAY_KEYS).map((market) =>
      normalizeMarket(market, match, payload)
    )
  };
}

function normalizeTxOddsPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("TxODDS payload must be a JSON object");
  }

  const matches = firstArray(payload, MATCH_ARRAY_KEYS);
  if (!matches.length) {
    throw new Error(`TxODDS payload must include one of: ${MATCH_ARRAY_KEYS.join(", ")}`);
  }

  return {
    generatedAt: firstDefined(payload.generatedAt, payload.capturedAt, payload.updatedAt, payload.timestamp),
    serviceLevelId: firstDefined(
      payload.serviceLevelId,
      payload.subscription?.serviceLevelId,
      payload.plan?.serviceLevelId,
      null
    ),
    matches: matches.map((match) => normalizeMatch(match, payload))
  };
}

function round(value, decimals = 4) {
  const factor = 10 ** decimals;
  const rounded = Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function pctPoints(probability) {
  return round(probability * 100, 2);
}

function impliedProbability(decimalOdds) {
  const odds = Number(decimalOdds);
  if (!Number.isFinite(odds) || odds <= 1) {
    throw new Error(`decimal odds must be greater than 1, received ${decimalOdds}`);
  }
  return 1 / odds;
}

function minutesBetween(olderIso, newerIso) {
  const older = new Date(olderIso);
  const newer = new Date(newerIso);
  if (Number.isNaN(older.valueOf()) || Number.isNaN(newer.valueOf())) {
    throw new Error(`invalid timestamp comparison: ${olderIso} -> ${newerIso}`);
  }
  return (newer.getTime() - older.getTime()) / 60000;
}

function marketOverround(selections) {
  return selections.reduce((sum, selection) => sum + impliedProbability(selection.odds), 0) - 1;
}

function analyzeSelections(selections) {
  return selections.map((selection) => {
    const implied = impliedProbability(selection.odds);
    const previousImplied = selection.previousOdds
      ? impliedProbability(selection.previousOdds)
      : null;
    const probabilityDelta = previousImplied === null ? null : implied - previousImplied;

    return {
      name: selection.name,
      odds: Number(selection.odds),
      previousOdds: selection.previousOdds === undefined ? null : Number(selection.previousOdds),
      impliedProbability: round(implied),
      impliedPct: pctPoints(implied),
      probabilityDeltaPctPoints:
        probabilityDelta === null ? null : pctPoints(probabilityDelta)
    };
  });
}

function buildMovementFlags(match, market, selectionSummaries, options) {
  return selectionSummaries
    .filter(
      (selection) =>
        selection.probabilityDeltaPctPoints !== null &&
        Math.abs(selection.probabilityDeltaPctPoints) >= options.moveThresholdPctPoints
    )
    .map((selection) => ({
      code: "LARGE_ODDS_MOVE",
      severity: Math.abs(selection.probabilityDeltaPctPoints) >= 8 ? "high" : "medium",
      matchId: match.id,
      marketId: market.id,
      selection: selection.name,
      detail: `${selection.name} moved ${selection.probabilityDeltaPctPoints} probability points`,
      score: Math.abs(selection.probabilityDeltaPctPoints) >= 8 ? 4 : 2
    }));
}

function buildSettlementFlags(match, market, selectionSummaries, options) {
  const settlement = market.externalSettlement;
  if (!settlement) {
    return [];
  }

  const flags = [];
  if (
    (match.eventState?.phase === "finished" || match.status === "finished") &&
    settlement.status !== "settled"
  ) {
    flags.push({
      code: "EVENT_MARKET_MISMATCH",
      severity: "high",
      matchId: match.id,
      marketId: market.id,
      detail: `event is finished but settlement status is ${settlement.status}`,
      score: 5
    });
  }

  if (settlement.implied) {
    for (const selection of selectionSummaries) {
      const externalProbability = settlement.implied[selection.name];
      if (externalProbability === undefined) {
        continue;
      }
      const driftPctPoints = pctPoints(selection.impliedProbability - externalProbability);
      if (Math.abs(driftPctPoints) >= options.settlementDriftPctPoints) {
        flags.push({
          code: "SETTLEMENT_DRIFT",
          severity: Math.abs(driftPctPoints) >= 15 ? "high" : "medium",
          matchId: match.id,
          marketId: market.id,
          selection: selection.name,
          detail: `${selection.name} differs from external implied probability by ${driftPctPoints} points`,
          score: Math.abs(driftPctPoints) >= 15 ? 4 : 2
        });
      }
    }
  }

  return flags;
}

function analyzeMarket(match, market, options) {
  const selectionSummaries = analyzeSelections(market.selections ?? []);
  const overroundPct = pctPoints(marketOverround(market.selections ?? []));
  const ageMinutes = round(minutesBetween(market.lastUpdated, options.now), 2);
  const flags = [];

  if (ageMinutes > options.staleMinutes) {
    flags.push({
      code: "STALE_FEED",
      severity: ageMinutes > options.staleMinutes * 2 ? "high" : "medium",
      matchId: match.id,
      marketId: market.id,
      detail: `${market.name} last updated ${ageMinutes} minutes ago`,
      score: ageMinutes > options.staleMinutes * 2 ? 3 : 1
    });
  }

  if (overroundPct < options.overroundLowPct || overroundPct > options.overroundHighPct) {
    flags.push({
      code: "OVERROUND_OUTLIER",
      severity: "medium",
      matchId: match.id,
      marketId: market.id,
      detail: `${market.name} overround is ${overroundPct}%`,
      score: 2
    });
  }

  flags.push(...buildMovementFlags(match, market, selectionSummaries, options));
  flags.push(...buildSettlementFlags(match, market, selectionSummaries, options));

  return {
    matchId: match.id,
    marketId: market.id,
    name: market.name,
    provider: market.provider,
    ageMinutes,
    overroundPct,
    selections: selectionSummaries,
    flags
  };
}

const ACTION_TEMPLATES = Object.freeze({
  EVENT_MARKET_MISMATCH: {
    priority: 1,
    title: "Pause settlement automation",
    detail:
      "Finished events still showing open settlement state should be held for manual review before any automated payout, market close, or downstream agent action.",
    nextStep: "Refresh event and settlement sources, then release automation only after the states agree."
  },
  SETTLEMENT_DRIFT: {
    priority: 2,
    title: "Require cross-source review",
    detail:
      "Large probability drift against the settlement reference means the market should not be treated as a clean settlement or quoting source yet.",
    nextStep: "Compare the affected selections against an independent source before quoting or settling."
  },
  LARGE_ODDS_MOVE: {
    priority: 3,
    title: "Throttle trading decisions",
    detail:
      "Large implied-probability movement can indicate breaking team news, feed correction, or stale previous-state assumptions.",
    nextStep: "Request a fresh snapshot and require an operator or strategy rule to acknowledge the move."
  },
  STALE_FEED: {
    priority: 4,
    title: "Refresh the feed before action",
    detail:
      "A stale market update should not drive automated trading, pricing, or settlement workflows.",
    nextStep: "Pull a newer provider snapshot or suppress the market until the update age returns inside threshold."
  },
  OVERROUND_OUTLIER: {
    priority: 5,
    title: "Check book margin mapping",
    detail:
      "Outlier overround can point to malformed odds, incomplete selections, or a provider mapping issue.",
    nextStep: "Verify all selections are present and decimal odds were normalized correctly."
  }
});

function severityRank(severity) {
  if (severity === "high") {
    return 3;
  }
  if (severity === "medium") {
    return 2;
  }
  return 1;
}

function highestSeverity(flags) {
  return flags.reduce(
    (current, flag) => (severityRank(flag.severity) > severityRank(current) ? flag.severity : current),
    "low"
  );
}

function buildRecommendedActions(flags) {
  const grouped = new Map();
  for (const flag of flags) {
    const template = ACTION_TEMPLATES[flag.code];
    if (!template) {
      continue;
    }
    const entry = grouped.get(flag.code) ?? {
      code: flag.code,
      ...template,
      flagCount: 0,
      matches: new Set(),
      markets: new Set(),
      flags: []
    };
    entry.flagCount += 1;
    entry.matches.add(flag.matchId);
    entry.markets.add(flag.marketId);
    entry.flags.push(flag);
    grouped.set(flag.code, entry);
  }

  return [...grouped.values()]
    .map((entry) => ({
      code: entry.code,
      priority: entry.priority,
      severity: highestSeverity(entry.flags),
      title: entry.title,
      detail: entry.detail,
      nextStep: entry.nextStep,
      flagCount: entry.flagCount,
      matches: [...entry.matches].sort(),
      markets: [...entry.markets].sort()
    }))
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        severityRank(right.severity) - severityRank(left.severity) ||
        right.flagCount - left.flagCount ||
        left.code.localeCompare(right.code)
    );
}

function marketReadiness(market) {
  const highestMarketSeverity = highestSeverity(market.flags);
  const state =
    highestMarketSeverity === "high" ? "blocked" : market.flags.length ? "review" : "ready";

  return {
    matchId: market.matchId,
    marketId: market.marketId,
    name: market.name,
    state,
    highestSeverity: highestMarketSeverity,
    flagCodes: [...new Set(market.flags.map((flag) => flag.code))].sort()
  };
}

function buildAutomationReadiness(markets, flags) {
  const flagCodes = new Set(flags.map((flag) => flag.code));
  const marketStates = markets.map(marketReadiness);
  const blockedMarketCount = marketStates.filter((market) => market.state === "blocked").length;
  const reviewMarketCount = marketStates.filter((market) => market.state === "review").length;
  const readyMarketCount = marketStates.filter((market) => market.state === "ready").length;
  const state = blockedMarketCount > 0 ? "blocked" : reviewMarketCount > 0 ? "review" : "ready";

  return {
    state,
    agentInstruction:
      state === "blocked"
        ? "Do not automate settlement, trading, or quoting until the blocking flags are cleared."
        : state === "review"
          ? "Allow read-only monitoring, but require operator review before downstream action."
          : "No analyzer gate is blocking automated read-only decisions for this snapshot.",
    checks: {
      settlementReady:
        !flagCodes.has("EVENT_MARKET_MISMATCH") && !flagCodes.has("SETTLEMENT_DRIFT"),
      tradingReady: !(
        flagCodes.has("EVENT_MARKET_MISMATCH") ||
        flagCodes.has("SETTLEMENT_DRIFT") ||
        flagCodes.has("LARGE_ODDS_MOVE") ||
        flagCodes.has("STALE_FEED")
      ),
      quotingReady: !(flagCodes.has("STALE_FEED") || flagCodes.has("OVERROUND_OUTLIER")),
      requiresHumanReview: flags.length > 0
    },
    marketCounts: {
      total: marketStates.length,
      ready: readyMarketCount,
      review: reviewMarketCount,
      blocked: blockedMarketCount
    },
    blockingFlagCodes: [...flagCodes]
      .filter((code) => ["EVENT_MARKET_MISMATCH", "SETTLEMENT_DRIFT", "LARGE_ODDS_MOVE"].includes(code))
      .sort(),
    markets: marketStates
  };
}

function analyzeFeed(feed, options = {}) {
  const normalizedOptions = {
    ...DEFAULTS,
    ...options,
    now: options.now ?? feed.generatedAt ?? new Date().toISOString()
  };
  const matches = feed.matches ?? [];
  const markets = [];
  const flags = [];

  for (const match of matches) {
    for (const market of match.markets ?? []) {
      const summary = analyzeMarket(match, market, normalizedOptions);
      markets.push(summary);
      flags.push(...summary.flags);
    }
  }

  const sortedFlags = flags.sort(
    (left, right) => right.score - left.score || left.code.localeCompare(right.code)
  );
  const recommendedActions = buildRecommendedActions(sortedFlags);
  const riskScore = flags.reduce((sum, flag) => sum + flag.score, 0);

  return {
    generatedAt: normalizedOptions.generatedAt ?? normalizedOptions.now,
    inputGeneratedAt: feed.generatedAt ?? null,
    analysisTime: normalizedOptions.now,
    serviceLevelId: feed.serviceLevelId ?? null,
    matchCount: matches.length,
    marketCount: markets.length,
    riskScore,
    flagCount: flags.length,
    recommendedActionCount: recommendedActions.length,
    recommendedActions,
    automationReadiness: buildAutomationReadiness(markets, sortedFlags),
    flags: sortedFlags,
    markets
  };
}

function setMetric(id, value) {
  document.querySelector(id).textContent = String(value);
}

function addCell(row, value, useCode = false) {
  const cell = document.createElement("td");
  const node = useCode ? document.createElement("code") : cell;
  node.textContent = String(value ?? "");
  if (useCode) {
    cell.append(node);
  }
  row.append(cell);
}

function renderFlags(flags) {
  rowContainer.replaceChildren();
  const visibleFlags = flags.slice(0, 8);

  if (!visibleFlags.length) {
    const row = document.createElement("tr");
    addCell(row, "NO_FLAGS", true);
    addCell(row, "n/a");
    addCell(row, "No current analyzer flags for this payload.");
    rowContainer.append(row);
    return;
  }

  for (const flag of visibleFlags) {
    const row = document.createElement("tr");
    addCell(row, flag.code, true);
    addCell(row, flag.matchId);
    addCell(row, flag.detail);
    rowContainer.append(row);
  }
}

function renderReport(report) {
  setMetric("#matches", report.matchCount);
  setMetric("#markets", report.marketCount);
  setMetric("#flags", report.flagCount);
  setMetric("#risk", report.riskScore);
  setMetric("#automation-gate", report.automationReadiness.state);
  renderFlags(report.flags);
}

function runAnalysis() {
  try {
    const payload = JSON.parse(payloadInput.value);
    const feed = normalizeTxOddsPayload(payload);
    const now = feed.generatedAt ?? new Date().toISOString();
    const report = analyzeFeed(feed, { now, generatedAt: now });
    errorNode.textContent = "";
    renderReport(report);
  } catch (error) {
    errorNode.textContent = error.message;
  }
}

function loadSample() {
  payloadInput.value = JSON.stringify(samplePayload, null, 2);
  runAnalysis();
}

document.querySelector("#run-analysis").addEventListener("click", runAnalysis);
document.querySelector("#load-sample").addEventListener("click", loadSample);
loadSample();
