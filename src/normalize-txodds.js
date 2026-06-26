const MATCH_ARRAY_KEYS = ["matches", "events", "fixtures", "games"];
const MARKET_ARRAY_KEYS = ["markets", "odds", "books"];
const SELECTION_ARRAY_KEYS = ["selections", "outcomes", "runners", "prices"];

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
  const selections = firstArray(market, SELECTION_ARRAY_KEYS);
  const context = `market ${id}`;

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
    selections: selections.map((selection) => normalizeSelection(selection, context)),
    ...(normalizeSettlement(firstDefined(market.externalSettlement, market.settlement))
      ? { externalSettlement: normalizeSettlement(firstDefined(market.externalSettlement, market.settlement)) }
      : {})
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

export function normalizeTxOddsPayload(payload) {
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
