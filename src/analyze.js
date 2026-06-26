const DEFAULTS = Object.freeze({
  staleMinutes: 15,
  moveThresholdPctPoints: 3,
  settlementDriftPctPoints: 8,
  overroundLowPct: -2,
  overroundHighPct: 12
});

export function impliedProbability(decimalOdds) {
  const odds = Number(decimalOdds);
  if (!Number.isFinite(odds) || odds <= 1) {
    throw new Error(`decimal odds must be greater than 1, received ${decimalOdds}`);
  }
  return 1 / odds;
}

export function round(value, decimals = 4) {
  const factor = 10 ** decimals;
  const rounded = Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function pctPoints(probability) {
  return round(probability * 100, 2);
}

export function marketOverround(selections) {
  const totalProbability = selections.reduce(
    (sum, selection) => sum + impliedProbability(selection.odds),
    0
  );
  return totalProbability - 1;
}

export function minutesBetween(olderIso, newerIso) {
  const older = new Date(olderIso);
  const newer = new Date(newerIso);
  if (Number.isNaN(older.valueOf()) || Number.isNaN(newer.valueOf())) {
    throw new Error(`invalid timestamp comparison: ${olderIso} -> ${newerIso}`);
  }
  return (newer.getTime() - older.getTime()) / 60000;
}

function normalizeOptions(options = {}) {
  return {
    ...DEFAULTS,
    ...options,
    now: options.now ?? new Date().toISOString()
  };
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

export function analyzeFeed(feed, options = {}) {
  const normalizedOptions = normalizeOptions(options);
  const matches = feed.matches ?? [];
  const marketSummaries = [];
  const flags = [];

  for (const match of matches) {
    for (const market of match.markets ?? []) {
      const summary = analyzeMarket(match, market, normalizedOptions);
      marketSummaries.push(summary);
      flags.push(...summary.flags);
    }
  }

  const riskScore = flags.reduce((sum, flag) => sum + flag.score, 0);

  return {
    generatedAt: normalizedOptions.generatedAt ?? new Date().toISOString(),
    inputGeneratedAt: feed.generatedAt ?? null,
    analysisTime: normalizedOptions.now,
    serviceLevelId: feed.serviceLevelId ?? null,
    matchCount: matches.length,
    marketCount: marketSummaries.length,
    riskScore,
    flagCount: flags.length,
    flags: flags.sort((left, right) => right.score - left.score || left.code.localeCompare(right.code)),
    markets: marketSummaries
  };
}
