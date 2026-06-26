export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function severityClass(severity) {
  if (severity === "high") {
    return "sev-high";
  }
  if (severity === "medium") {
    return "sev-medium";
  }
  return "sev-low";
}

function formatSigned(value) {
  if (value === null || value === undefined) {
    return "n/a";
  }
  return Number(value) > 0 ? `+${value}` : String(value);
}

function riskLabel(score) {
  if (score >= 30) {
    return "elevated";
  }
  if (score >= 12) {
    return "watch";
  }
  return "quiet";
}

function jsonForScript(value) {
  return JSON.stringify(value, null, 2).replaceAll("<", "\\u003c");
}

function flagRows(flags) {
  return flags
    .map(
      (flag) => `
        <tr>
          <td><span class="signal ${severityClass(flag.severity)}">${escapeHtml(flag.severity)}</span></td>
          <td><code>${escapeHtml(flag.code)}</code></td>
          <td>${escapeHtml(flag.matchId)}</td>
          <td>${escapeHtml(flag.detail)}</td>
          <td class="num">${escapeHtml(flag.score)}</td>
        </tr>`
    )
    .join("");
}

function briefFlagRows(flags) {
  if (!flags.length) {
    return '<tr><td colspan="4">No review flags detected.</td></tr>';
  }

  return flags
    .slice(0, 5)
    .map(
      (flag) => `
        <tr>
          <td><span class="signal ${severityClass(flag.severity)}">${escapeHtml(flag.severity)}</span></td>
          <td><code>${escapeHtml(flag.code)}</code></td>
          <td>${escapeHtml(flag.matchId)}</td>
          <td>${escapeHtml(flag.detail)}</td>
        </tr>`
    )
    .join("");
}

function actionRows(actions, options = {}) {
  const compact = Boolean(options.compact);
  if (!actions.length) {
    return `<tr><td colspan="${compact ? 4 : 5}">No recommended agent actions for this report.</td></tr>`;
  }

  return actions
    .map(
      (action) => `
        <tr>
          <td class="num">${escapeHtml(action.priority)}</td>
          <td><span class="signal ${severityClass(action.severity)}">${escapeHtml(action.severity)}</span></td>
          <td><strong>${escapeHtml(action.title)}</strong><br><code>${escapeHtml(action.code)}</code></td>
          ${compact ? "" : `<td>${escapeHtml(action.matches.join(", "))}</td>`}
          <td>${escapeHtml(action.nextStep)}</td>
        </tr>`
    )
    .join("");
}

function selectionRows(selections) {
  return selections
    .map((selection) => {
      const width = Math.max(4, Math.min(100, selection.impliedPct));
      return `
        <tr>
          <td>${escapeHtml(selection.name)}</td>
          <td class="num">${escapeHtml(selection.odds.toFixed(2))}</td>
          <td>
            <div class="probability">
              <span style="width: ${width}%"></span>
            </div>
          </td>
          <td class="num">${escapeHtml(selection.impliedPct)}%</td>
          <td class="num">${escapeHtml(formatSigned(selection.probabilityDeltaPctPoints))}</td>
        </tr>`;
    })
    .join("");
}

function marketPanels(markets) {
  return markets
    .map(
      (market) => `
        <article class="market">
          <div class="market-head">
            <div>
              <p class="eyebrow">${escapeHtml(market.matchId)}</p>
              <h2>${escapeHtml(market.name)}</h2>
            </div>
            <div class="market-metrics" aria-label="Market metrics">
              <span>${escapeHtml(market.provider)}</span>
              <strong>${escapeHtml(market.overroundPct)}% overround</strong>
              <strong>${escapeHtml(market.ageMinutes)}m age</strong>
              ${
                market.settlementLagMinutes === null
                  ? ""
                  : `<strong>${escapeHtml(market.settlementLagMinutes)}m settlement lag</strong>`
              }
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Selection</th>
                <th>Odds</th>
                <th>Implied</th>
                <th>Prob.</th>
                <th>Move</th>
              </tr>
            </thead>
            <tbody>
              ${selectionRows(market.selections)}
            </tbody>
          </table>
          <div class="market-flags">
            ${
              market.flags.length
                ? market.flags
                    .map(
                      (flag) =>
                        `<span class="${severityClass(flag.severity)}">${escapeHtml(flag.code)}</span>`
                    )
                    .join("")
                : '<span class="sev-low">NO_FLAGS</span>'
            }
          </div>
        </article>`
    )
    .join("");
}

export function renderReportHtml(report) {
  const topFlags = report.flags.slice(0, 8);
  const status = riskLabel(report.riskScore);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TxODDS World Cup Sentinel</title>
  <style>
    :root {
      color-scheme: dark;
      --ink: #f6f1e8;
      --muted: #a9b2a6;
      --line: #30362f;
      --panel: #151914;
      --panel-strong: #1f251d;
      --page: #090c09;
      --green: #7dde92;
      --cyan: #7dd3fc;
      --amber: #f6c85f;
      --red: #ff6b5e;
      --blue: #799cff;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background:
        linear-gradient(135deg, rgba(125, 222, 146, 0.10), transparent 28rem),
        linear-gradient(225deg, rgba(121, 156, 255, 0.12), transparent 24rem),
        var(--page);
      color: var(--ink);
      font-family: "Avenir Next", "Gill Sans", Verdana, sans-serif;
      letter-spacing: 0;
    }

    main {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
      padding: 34px 0 48px;
    }

    header {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
      gap: 24px;
      align-items: end;
      border-bottom: 1px solid var(--line);
      padding-bottom: 24px;
    }

    h1, h2, p { margin: 0; }

    h1 {
      max-width: 780px;
      font-family: "Iowan Old Style", "Palatino Linotype", serif;
      font-size: clamp(2.2rem, 5vw, 5.4rem);
      line-height: 0.96;
      font-weight: 700;
    }

    h2 {
      font-family: "Iowan Old Style", "Palatino Linotype", serif;
      font-size: 1.4rem;
      line-height: 1.1;
    }

    .eyebrow {
      color: var(--green);
      font-family: Menlo, Consolas, monospace;
      font-size: 0.75rem;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .brief {
      margin-top: 18px;
      color: var(--muted);
      max-width: 680px;
      line-height: 1.6;
      font-size: 1.02rem;
    }

    .status-board {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .metric {
      min-height: 96px;
      border: 1px solid var(--line);
      background: rgba(21, 25, 20, 0.86);
      padding: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .metric span {
      color: var(--muted);
      font-size: 0.76rem;
      text-transform: uppercase;
    }

    .metric strong {
      color: var(--ink);
      font-size: 1.65rem;
      line-height: 1;
    }

    .metric.status strong { color: var(--amber); }

    .section-head {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: end;
      margin: 34px 0 14px;
    }

    .section-head p {
      color: var(--muted);
      max-width: 560px;
      line-height: 1.5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      color: var(--muted);
      font-size: 0.72rem;
      font-weight: 700;
      text-align: left;
      text-transform: uppercase;
    }

    td, th {
      border-bottom: 1px solid var(--line);
      padding: 12px 10px;
      vertical-align: middle;
    }

    td {
      color: var(--ink);
      font-size: 0.94rem;
    }

    code {
      color: var(--cyan);
      font-family: Menlo, Consolas, monospace;
      font-size: 0.82rem;
    }

    .num { text-align: right; white-space: nowrap; }

    .signals, .markets {
      border: 1px solid var(--line);
      background: rgba(15, 18, 14, 0.74);
    }

    .signal, .market-flags span {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border: 1px solid currentColor;
      padding: 3px 8px;
      font-family: Menlo, Consolas, monospace;
      font-size: 0.72rem;
      text-transform: uppercase;
    }

    .sev-high { color: var(--red); }
    .sev-medium { color: var(--amber); }
    .sev-low { color: var(--green); }

    .markets {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1px;
      background: var(--line);
    }

    .market {
      background: var(--panel);
      padding: 18px;
      min-width: 0;
    }

    .market-head {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 18px;
    }

    .market-metrics {
      display: grid;
      gap: 6px;
      justify-items: end;
      color: var(--muted);
      font-size: 0.78rem;
      text-align: right;
    }

    .market-metrics strong {
      color: var(--ink);
      font-size: 0.86rem;
    }

    .probability {
      height: 9px;
      background: #242a22;
      overflow: hidden;
      min-width: 90px;
    }

    .probability span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, var(--green), var(--cyan));
    }

    .market-flags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    footer {
      color: var(--muted);
      border-top: 1px solid var(--line);
      margin-top: 36px;
      padding-top: 18px;
      line-height: 1.5;
    }

    footer a {
      color: var(--cyan);
    }

    @media (max-width: 780px) {
      main { width: min(100% - 20px, 1180px); padding-top: 22px; }
      header, .markets { grid-template-columns: 1fr; }
      .status-board { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .market-head, .section-head { display: grid; }
      .market-metrics { justify-items: start; text-align: left; }
      td, th { padding: 10px 6px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <p class="eyebrow">TxODDS fixture sentinel / demo-data mode</p>
        <h1>World Cup odds integrity watch</h1>
        <p class="brief">Static report generated from replayable demo data. The analyzer highlights stale feeds, odds shocks, overround anomalies, and settlement drift without custody, wallet signing, or live API keys. Captured TxODDS-shaped JSON can be normalized offline before a safe token path exists.</p>
      </div>
      <aside class="status-board" aria-label="Report summary">
        <div class="metric status"><span>Risk state</span><strong>${escapeHtml(status)}</strong></div>
        <div class="metric"><span>Risk score</span><strong>${escapeHtml(report.riskScore)}</strong></div>
        <div class="metric"><span>Markets</span><strong>${escapeHtml(report.marketCount)}</strong></div>
        <div class="metric"><span>Flags</span><strong>${escapeHtml(report.flagCount)}</strong></div>
      </aside>
    </header>

    <section>
      <div class="section-head">
        <div>
          <p class="eyebrow">Ranked signals</p>
          <h2>What needs review first</h2>
        </div>
        <p>Generated at ${escapeHtml(report.generatedAt)} from feed ${escapeHtml(report.inputGeneratedAt)}. Analysis time: ${escapeHtml(report.analysisTime)}. Service level: ${escapeHtml(report.serviceLevelId)}.</p>
      </div>
      <div class="signals">
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Code</th>
              <th>Match</th>
              <th>Detail</th>
              <th class="num">Score</th>
            </tr>
          </thead>
          <tbody>
            ${flagRows(topFlags)}
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <p class="eyebrow">Agent actions</p>
          <h2>What an automated strategy should do</h2>
        </div>
        <p>Recommendations are derived deterministically from the ranked flags, so a trading or settlement agent can decide when to pause, refresh, or request review without needing live credentials.</p>
      </div>
      <div class="signals">
        <table>
          <thead>
            <tr>
              <th class="num">Priority</th>
              <th>Severity</th>
              <th>Action</th>
              <th>Matches</th>
              <th>Next step</th>
            </tr>
          </thead>
          <tbody>
            ${actionRows(report.recommendedActions)}
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <p class="eyebrow">Market tape</p>
          <h2>Odds and settlement surface</h2>
        </div>
        <p>Each market keeps the selection probabilities, movement from the previous snapshot, source age, settlement lag, and detected flags visible for fast judge review.</p>
      </div>
      <div class="markets">
        ${marketPanels(report.markets)}
      </div>
    </section>

    <footer>
      <p>Demo-data mode only. Live TxODDS integration should use the captured-payload normalizer or an adapter that emits the same feed shape after a safe API-token route exists. This page does not require a wallet, paid subscription, private key, seed phrase, or external network call.</p>
      <p>Reviewer links: <a href="./judge-brief.html">judge evaluation brief</a>, <a href="./compliance.html">hackathon compliance note</a>, <a href="./demo-video.html">captioned demo video page</a>, <a href="./judge-playground.html">paste-in TxODDS judge playground</a>, <a href="https://github.com/chico10117/txodds-worldcup-sentinel/blob/main/media/demo.mp4">GitHub demo MP4</a>, <a href="./report.json">fixture report JSON</a>, <a href="./txodds-capture-report.json">captured TxODDS report JSON</a>, <a href="./replay-manifest.json">replay manifest JSON</a>, and <a href="./.well-known/ai.txt">AI-readable review manifest</a>.</p>
    </footer>
  </main>
</body>
</html>
`;

  return html.replace(/[ \t]+$/gm, "");
}

export function renderPlaygroundHtml(samplePayload) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TxODDS Judge Playground</title>
  <style>
    :root {
      color-scheme: dark;
      --ink: #f6f1e8;
      --muted: #abb6ac;
      --line: #30362f;
      --panel: #151914;
      --page: #090c09;
      --green: #7dde92;
      --cyan: #7dd3fc;
      --amber: #f6c85f;
      --red: #ff6b5e;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background:
        linear-gradient(135deg, rgba(125, 222, 146, 0.10), transparent 28rem),
        linear-gradient(225deg, rgba(125, 211, 252, 0.10), transparent 24rem),
        var(--page);
      color: var(--ink);
      font-family: "Avenir Next", "Gill Sans", Verdana, sans-serif;
      letter-spacing: 0;
    }

    main {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 34px 0 48px;
    }

    h1, h2, p { margin: 0; }

    h1 {
      max-width: 780px;
      font-family: "Iowan Old Style", "Palatino Linotype", serif;
      font-size: clamp(2.1rem, 5vw, 4.8rem);
      line-height: 0.98;
      font-weight: 700;
    }

    h2 {
      font-family: "Iowan Old Style", "Palatino Linotype", serif;
      font-size: 1.35rem;
      line-height: 1.1;
    }

    .eyebrow {
      color: var(--green);
      font-family: Menlo, Consolas, monospace;
      font-size: 0.75rem;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .brief {
      margin-top: 16px;
      color: var(--muted);
      max-width: 780px;
      line-height: 1.6;
      font-size: 1rem;
    }

    .workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 0.72fr);
      gap: 18px;
      margin-top: 28px;
      align-items: start;
    }

    textarea {
      width: 100%;
      min-height: 500px;
      resize: vertical;
      border: 1px solid var(--line);
      background: #0f120e;
      color: var(--ink);
      padding: 14px;
      font: 0.85rem/1.45 Menlo, Consolas, monospace;
    }

    button {
      border: 1px solid var(--green);
      background: #132017;
      color: var(--green);
      cursor: pointer;
      font-weight: 700;
      min-height: 42px;
      padding: 0 14px;
    }

    button.secondary {
      border-color: var(--line);
      background: var(--panel);
      color: var(--cyan);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }

    .panel {
      border: 1px solid var(--line);
      background: rgba(21, 25, 20, 0.86);
      padding: 16px;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }

    .metric {
      border: 1px solid var(--line);
      padding: 12px;
      min-height: 86px;
    }

    .metric span {
      color: var(--muted);
      display: block;
      font-size: 0.72rem;
      text-transform: uppercase;
    }

    .metric strong {
      color: var(--amber);
      display: block;
      font-size: 1.55rem;
      margin-top: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
    }

    th {
      color: var(--muted);
      font-size: 0.7rem;
      text-align: left;
      text-transform: uppercase;
    }

    td, th {
      border-bottom: 1px solid var(--line);
      padding: 10px 8px;
      vertical-align: top;
    }

    td { font-size: 0.9rem; }

    code {
      color: var(--cyan);
      font-family: Menlo, Consolas, monospace;
      font-size: 0.8rem;
    }

    .error {
      color: var(--red);
      margin-top: 12px;
      min-height: 1.4em;
    }

    footer {
      color: var(--muted);
      border-top: 1px solid var(--line);
      margin-top: 32px;
      padding-top: 18px;
      line-height: 1.5;
    }

    a { color: var(--cyan); }

    @media (max-width: 820px) {
      main { width: min(100% - 20px, 1120px); padding-top: 22px; }
      .workspace, .summary { grid-template-columns: 1fr; }
      textarea { min-height: 360px; }
    }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">TxODDS World Cup Sentinel / local judge tool</p>
    <h1>Paste captured TxODDS JSON and analyze it in-browser</h1>
    <p class="brief">This page runs the same odds, stale-feed, overround, movement, and settlement-drift checks without sending data anywhere. It does not connect a wallet, request a token, call TxODDS, or make network requests.</p>

    <section class="workspace" aria-label="In-browser analyzer workspace">
      <div>
        <textarea id="payload" spellcheck="false" aria-label="Captured TxODDS JSON payload"></textarea>
        <div class="actions">
          <button id="run-analysis" type="button">Run local analysis</button>
          <button id="load-sample" class="secondary" type="button">Reload sample payload</button>
        </div>
        <p id="error" class="error" role="alert"></p>
      </div>

      <aside class="panel" aria-live="polite">
        <p class="eyebrow">Local output</p>
        <h2>Analyzer result</h2>
        <div class="summary">
          <div class="metric"><span>Matches</span><strong id="matches">0</strong></div>
          <div class="metric"><span>Markets</span><strong id="markets">0</strong></div>
          <div class="metric"><span>Flags</span><strong id="flags">0</strong></div>
          <div class="metric"><span>Risk score</span><strong id="risk">0</strong></div>
        </div>
        <table aria-label="Top local flags">
          <thead>
            <tr>
              <th>Code</th>
              <th>Match</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody id="flag-rows"></tbody>
        </table>
      </aside>
    </section>

    <footer>
      <p>Sample payload is embedded from the repository fixture. For replay evidence, see <a href="./judge-brief.html">judge evaluation brief</a>, <a href="./compliance.html">hackathon compliance note</a>, <a href="./replay-manifest.json">replay-manifest.json</a>, <a href="./report.json">fixture report JSON</a>, and <a href="./txodds-capture-report.json">captured TxODDS report JSON</a>.</p>
    </footer>
  </main>
  <script type="application/json" id="sample-payload">${jsonForScript(samplePayload)}</script>
  <script type="module" src="./playground.js"></script>
</body>
</html>
`;

  return html.replace(/[ \t]+$/gm, "");
}

export function renderJudgeBriefHtml(report, txOddsReport) {
  const fixtureState = riskLabel(report.riskScore);
  const txOddsState = riskLabel(txOddsReport.riskScore);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TxODDS Judge Evaluation Brief</title>
  <style>
    :root {
      color-scheme: dark;
      --ink: #f6f1e8;
      --muted: #abb6ac;
      --line: #30362f;
      --panel: #151914;
      --page: #090c09;
      --green: #7dde92;
      --cyan: #7dd3fc;
      --amber: #f6c85f;
      --red: #ff6b5e;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background:
        linear-gradient(135deg, rgba(125, 222, 146, 0.10), transparent 28rem),
        linear-gradient(225deg, rgba(125, 211, 252, 0.10), transparent 24rem),
        var(--page);
      color: var(--ink);
      font-family: "Avenir Next", "Gill Sans", Verdana, sans-serif;
      letter-spacing: 0;
    }

    main {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 34px 0 48px;
    }

    h1, h2, h3, p { margin: 0; }

    h1 {
      max-width: 780px;
      font-family: "Iowan Old Style", "Palatino Linotype", serif;
      font-size: clamp(2.1rem, 5vw, 4.8rem);
      line-height: 0.98;
      font-weight: 700;
    }

    h2 {
      font-family: "Iowan Old Style", "Palatino Linotype", serif;
      font-size: 1.45rem;
      line-height: 1.1;
    }

    h3 {
      font-size: 1rem;
      line-height: 1.2;
    }

    .eyebrow {
      color: var(--green);
      font-family: Menlo, Consolas, monospace;
      font-size: 0.75rem;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .brief {
      margin-top: 16px;
      color: var(--muted);
      max-width: 820px;
      line-height: 1.6;
      font-size: 1rem;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 26px;
    }

    .metric {
      border: 1px solid var(--line);
      background: rgba(21, 25, 20, 0.86);
      min-height: 92px;
      padding: 14px;
    }

    .metric span {
      color: var(--muted);
      display: block;
      font-size: 0.72rem;
      text-transform: uppercase;
    }

    .metric strong {
      color: var(--amber);
      display: block;
      font-size: 1.45rem;
      margin-top: 8px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-top: 30px;
    }

    .panel {
      border: 1px solid var(--line);
      background: rgba(21, 25, 20, 0.86);
      padding: 16px;
      min-width: 0;
    }

    .panel p, .panel li {
      color: var(--muted);
      line-height: 1.55;
    }

    ul {
      margin: 12px 0 0;
      padding-left: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
    }

    th {
      color: var(--muted);
      font-size: 0.7rem;
      text-align: left;
      text-transform: uppercase;
    }

    td, th {
      border-bottom: 1px solid var(--line);
      padding: 10px 8px;
      vertical-align: top;
    }

    td {
      color: var(--ink);
      font-size: 0.9rem;
    }

    code {
      color: var(--cyan);
      font-family: Menlo, Consolas, monospace;
      font-size: 0.8rem;
    }

    .signal {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border: 1px solid currentColor;
      padding: 3px 8px;
      font-family: Menlo, Consolas, monospace;
      font-size: 0.72rem;
      text-transform: uppercase;
    }

    .sev-high { color: var(--red); }
    .sev-medium { color: var(--amber); }
    .sev-low { color: var(--green); }

    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }

    a { color: var(--cyan); }

    .links a {
      border: 1px solid var(--line);
      background: rgba(21, 25, 20, 0.84);
      padding: 10px 12px;
      text-decoration: none;
    }

    footer {
      color: var(--muted);
      border-top: 1px solid var(--line);
      margin-top: 32px;
      padding-top: 18px;
      line-height: 1.5;
    }

    @media (max-width: 820px) {
      main { width: min(100% - 20px, 1120px); padding-top: 22px; }
      .metrics, .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">TxODDS World Cup Sentinel / review packet</p>
    <h1>Judge evaluation brief</h1>
    <p class="brief">Single-page review packet for the public MVP. It compares the deterministic fixture report with the captured TxODDS-shaped report and points judges to the replayable artifacts without requiring wallet connection, API credentials, paid access, or live network calls.</p>

    <section class="metrics" aria-label="Evaluation summary">
      <div class="metric"><span>Fixture report</span><strong>${escapeHtml(fixtureState)}</strong></div>
      <div class="metric"><span>Fixture flags</span><strong>${escapeHtml(report.flagCount)}</strong></div>
      <div class="metric"><span>Captured TxODDS report</span><strong>${escapeHtml(txOddsState)}</strong></div>
      <div class="metric"><span>Agent actions</span><strong>${escapeHtml(report.recommendedActionCount + txOddsReport.recommendedActionCount)}</strong></div>
    </section>

    <section class="grid">
      <article class="panel">
        <p class="eyebrow">Fixture agent actions</p>
        <h2>Strategy guardrails</h2>
        <table aria-label="Recommended fixture report agent actions">
          <thead>
            <tr>
              <th>Priority</th>
              <th>Severity</th>
              <th>Action</th>
              <th>Next step</th>
            </tr>
          </thead>
          <tbody>
            ${actionRows(report.recommendedActions, { compact: true })}
          </tbody>
        </table>
      </article>

      <article class="panel">
        <p class="eyebrow">Captured payload actions</p>
        <h2>TxODDS-shaped replay guardrails</h2>
        <table aria-label="Recommended captured TxODDS report agent actions">
          <thead>
            <tr>
              <th>Priority</th>
              <th>Severity</th>
              <th>Action</th>
              <th>Next step</th>
            </tr>
          </thead>
          <tbody>
            ${actionRows(txOddsReport.recommendedActions, { compact: true })}
          </tbody>
        </table>
      </article>
    </section>

    <section class="grid">
      <article class="panel">
        <p class="eyebrow">What to verify</p>
        <h2>Public review path</h2>
        <ul>
          <li>Open the live MVP report and confirm the ranked risk signals render from replayable demo data.</li>
          <li>Use the judge playground to paste captured TxODDS-shaped JSON and run the same analyzer in the browser.</li>
          <li>Inspect the replay manifest for SHA-256 hashes, validation commands, report summaries, and public URLs.</li>
          <li>Compare the fixture JSON report with the captured TxODDS report to verify the adapter boundary.</li>
        </ul>
      </article>

      <article class="panel">
        <p class="eyebrow">Safety posture</p>
        <h2>No custody or secrets</h2>
        <ul>
          <li>The public MVP does not connect a wallet, sign transactions, request API tokens, or use private keys.</li>
          <li>The deterministic build uses local fixtures only and does not make live TxODDS, Solana, mainnet, or testnet calls.</li>
          <li>The browser playground uses embedded JavaScript and DOM text updates without fetch, XHR, storage, or navigator calls.</li>
          <li>Live TxODDS calls are intentionally excluded until a safe user-controlled API-token route exists.</li>
        </ul>
      </article>
    </section>

    <section class="grid">
      <article class="panel">
        <p class="eyebrow">Fixture report</p>
        <h2>Top replay flags</h2>
        <table aria-label="Top fixture report flags">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Code</th>
              <th>Match</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            ${briefFlagRows(report.flags)}
          </tbody>
        </table>
      </article>

      <article class="panel">
        <p class="eyebrow">Captured TxODDS report</p>
        <h2>Top normalized flags</h2>
        <table aria-label="Top captured TxODDS report flags">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Code</th>
              <th>Match</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            ${briefFlagRows(txOddsReport.flags)}
          </tbody>
        </table>
      </article>
    </section>

    <nav class="links" aria-label="Reviewer links">
      <a href="./index.html">Live MVP report</a>
      <a href="./compliance.html">Compliance note</a>
      <a href="./demo-video.html">Demo video page</a>
      <a href="./judge-playground.html">Judge playground</a>
      <a href="./replay-manifest.json">Replay manifest</a>
      <a href="./.well-known/ai.txt">AI-readable manifest</a>
      <a href="./report.json">Fixture report JSON</a>
      <a href="./txodds-capture-report.json">Captured TxODDS report JSON</a>
      <a href="https://github.com/chico10117/txodds-worldcup-sentinel">Public repository</a>
    </nav>

    <footer>
      <p>Generated at ${escapeHtml(report.generatedAt)}. Fixture analysis time: ${escapeHtml(report.analysisTime)}. Captured payload analysis time: ${escapeHtml(txOddsReport.analysisTime)}.</p>
    </footer>
  </main>
</body>
</html>
`;

  return html.replace(/[ \t]+$/gm, "");
}

export function renderComplianceHtml(report) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TxODDS World Cup Sentinel Compliance Note</title>
  <style>
    :root {
      color-scheme: dark;
      --ink: #f6f1e8;
      --muted: #abb6ac;
      --line: #30362f;
      --panel: #151914;
      --page: #090c09;
      --green: #7dde92;
      --cyan: #7dd3fc;
      --amber: #f6c85f;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background:
        linear-gradient(135deg, rgba(125, 222, 146, 0.10), transparent 28rem),
        linear-gradient(225deg, rgba(125, 211, 252, 0.10), transparent 24rem),
        var(--page);
      color: var(--ink);
      font-family: "Avenir Next", "Gill Sans", Verdana, sans-serif;
      letter-spacing: 0;
    }

    main {
      width: min(1040px, calc(100% - 32px));
      margin: 0 auto;
      padding: 34px 0 48px;
    }

    h1, h2, p { margin: 0; }

    h1 {
      max-width: 760px;
      font-family: "Iowan Old Style", "Palatino Linotype", serif;
      font-size: clamp(2.1rem, 5vw, 4.8rem);
      line-height: 0.98;
      font-weight: 700;
    }

    h2 {
      font-family: "Iowan Old Style", "Palatino Linotype", serif;
      font-size: 1.45rem;
      line-height: 1.1;
    }

    .eyebrow {
      color: var(--green);
      font-family: Menlo, Consolas, monospace;
      font-size: 0.75rem;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .brief {
      margin-top: 16px;
      color: var(--muted);
      max-width: 760px;
      line-height: 1.6;
      font-size: 1rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-top: 28px;
    }

    .panel, .metric {
      border: 1px solid var(--line);
      background: rgba(21, 25, 20, 0.84);
      padding: 18px;
    }

    .panel p, .panel li {
      color: var(--muted);
      line-height: 1.55;
    }

    .panel h2 { margin-bottom: 12px; }

    ul {
      margin: 0;
      padding-left: 20px;
    }

    li + li { margin-top: 8px; }

    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 18px;
    }

    .metric span {
      color: var(--muted);
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .metric strong {
      color: var(--amber);
      display: block;
      font-size: 1.4rem;
      margin-top: 7px;
    }

    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }

    a { color: var(--cyan); }

    .links a {
      border: 1px solid var(--line);
      background: rgba(21, 25, 20, 0.84);
      padding: 10px 12px;
      text-decoration: none;
    }

    footer {
      color: var(--muted);
      border-top: 1px solid var(--line);
      margin-top: 32px;
      padding-top: 18px;
      line-height: 1.5;
    }

    @media (max-width: 760px) {
      main { width: min(100% - 20px, 1040px); padding-top: 22px; }
      .grid, .summary { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">TxODDS World Cup Sentinel / compliance note</p>
    <h1>Reviewable without wallet or account setup</h1>
    <p class="brief">The public MVP is intentionally self-contained for judging. The live TxODDS adapter boundary is documented, but reviewers can inspect the working analyzer, replay reports, video, and paste-in playground without buying software, connecting a wallet, creating an account, paying for a subscription, or receiving an API token.</p>

    <section class="summary" aria-label="Compliance summary">
      <div class="metric"><span>Review mode</span><strong>self-contained</strong></div>
      <div class="metric"><span>Wallet required</span><strong>no</strong></div>
      <div class="metric"><span>Fixture flags</span><strong>${escapeHtml(report.flagCount)}</strong></div>
    </section>

    <section class="grid">
      <article class="panel">
        <h2>Hackathon assessment fit</h2>
        <ul>
          <li>The public pages are static artifacts and can be reviewed in a browser.</li>
          <li>The generated reports and replay manifest expose the analyzer output, commands, and SHA-256 hashes.</li>
          <li>The browser playground analyzes pasted TxODDS-shaped JSON locally and does not send data to a server.</li>
          <li>The demo video page provides a direct review path when a judge does not run code locally.</li>
        </ul>
      </article>

      <article class="panel">
        <h2>Deliberate live-data boundary</h2>
        <ul>
          <li>No private keys, seed phrases, API tokens, payment cards, or wallet signatures are included.</li>
          <li>The deterministic build does not call TxODDS, Solana RPC, mainnet, testnet, or any external API.</li>
          <li>The captured-payload normalizer shows how TxODDS-shaped JSON enters the analyzer without exposing credentials.</li>
          <li>A live TxODDS adapter should be added only after a safe user-controlled API-token route exists.</li>
        </ul>
      </article>
    </section>

    <nav class="links" aria-label="Reviewer links">
      <a href="./index.html">Live MVP report</a>
      <a href="./judge-brief.html">Judge brief</a>
      <a href="./demo-video.html">Demo video page</a>
      <a href="./judge-playground.html">Judge playground</a>
      <a href="./replay-manifest.json">Replay manifest</a>
      <a href="https://txline.txodds.com/documentation/legal/hackathon-terms">Hackathon terms</a>
      <a href="https://github.com/chico10117/txodds-worldcup-sentinel">Public repository</a>
    </nav>

    <footer>
      <p>Generated at ${escapeHtml(report.generatedAt)}. This page is a reviewer convenience artifact; the authoritative replay evidence remains the public repository, generated reports, and replay manifest.</p>
    </footer>
  </main>
</body>
</html>
`;

  return html.replace(/[ \t]+$/gm, "");
}

export function renderDemoVideoHtml(report) {
  const videoUrl =
    "https://raw.githubusercontent.com/chico10117/txodds-worldcup-sentinel/main/media/demo.mp4";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TxODDS World Cup Sentinel Demo Video</title>
  <style>
    :root {
      color-scheme: dark;
      --ink: #f6f1e8;
      --muted: #abb6ac;
      --line: #30362f;
      --panel: #151914;
      --page: #090c09;
      --green: #7dde92;
      --cyan: #7dd3fc;
      --amber: #f6c85f;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background:
        linear-gradient(135deg, rgba(125, 222, 146, 0.10), transparent 28rem),
        linear-gradient(225deg, rgba(125, 211, 252, 0.10), transparent 24rem),
        var(--page);
      color: var(--ink);
      font-family: "Avenir Next", "Gill Sans", Verdana, sans-serif;
      letter-spacing: 0;
    }

    main {
      width: min(1040px, calc(100% - 32px));
      margin: 0 auto;
      padding: 34px 0 48px;
    }

    h1, p { margin: 0; }

    h1 {
      max-width: 760px;
      font-family: "Iowan Old Style", "Palatino Linotype", serif;
      font-size: clamp(2.1rem, 5vw, 4.8rem);
      line-height: 0.98;
      font-weight: 700;
    }

    .eyebrow {
      color: var(--green);
      font-family: Menlo, Consolas, monospace;
      font-size: 0.75rem;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .brief {
      margin-top: 16px;
      color: var(--muted);
      max-width: 760px;
      line-height: 1.6;
      font-size: 1rem;
    }

    .video-frame {
      border: 1px solid var(--line);
      background: var(--panel);
      margin-top: 28px;
      padding: 14px;
    }

    video {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
    }

    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }

    a { color: var(--cyan); }

    .links a {
      border: 1px solid var(--line);
      background: rgba(21, 25, 20, 0.84);
      padding: 10px 12px;
      text-decoration: none;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 18px;
    }

    .metric {
      border: 1px solid var(--line);
      background: rgba(21, 25, 20, 0.84);
      padding: 14px;
    }

    .metric span {
      color: var(--muted);
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .metric strong {
      color: var(--amber);
      display: block;
      font-size: 1.4rem;
      margin-top: 7px;
    }

    footer {
      color: var(--muted);
      border-top: 1px solid var(--line);
      margin-top: 32px;
      padding-top: 18px;
      line-height: 1.5;
    }

    @media (max-width: 720px) {
      main { width: min(100% - 20px, 1040px); padding-top: 22px; }
      .summary { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">TxODDS World Cup Sentinel / captioned demo</p>
    <h1>Demo video for judge review</h1>
    <p class="brief">This page mirrors the public Superteam demo video in a directly playable browser page. The MVP is replayable demo-data mode only: it does not request wallet connection, private keys, seed phrases, paid subscriptions, API tokens, or live network access.</p>

    <section class="video-frame" aria-label="Captioned demo video">
      <video controls preload="metadata">
        <source src="${escapeHtml(videoUrl)}" type="video/mp4">
        <a href="${escapeHtml(videoUrl)}">Open the raw MP4 demo video</a>.
      </video>
    </section>

    <div class="summary" aria-label="Current report summary">
      <div class="metric"><span>Fixture flags</span><strong>${escapeHtml(report.flagCount)}</strong></div>
      <div class="metric"><span>Risk score</span><strong>${escapeHtml(report.riskScore)}</strong></div>
      <div class="metric"><span>Captured payload risk</span><strong>5</strong></div>
    </div>

    <nav class="links" aria-label="Reviewer links">
      <a href="./index.html">Live MVP report</a>
      <a href="./judge-brief.html">Judge brief</a>
      <a href="./compliance.html">Compliance note</a>
      <a href="./replay-manifest.json">Replay manifest</a>
      <a href="./report.json">Fixture report JSON</a>
      <a href="./txodds-capture-report.json">Captured TxODDS report JSON</a>
      <a href="https://github.com/chico10117/txodds-worldcup-sentinel">Public repository</a>
      <a href="https://github.com/chico10117/txodds-worldcup-sentinel/blob/main/media/demo.mp4">GitHub MP4 page</a>
    </nav>

    <footer>
      <p>Generated from the same deterministic build as the static report. Live TxODDS calls should be added only behind the captured-payload adapter boundary after a safe user-controlled API-token route exists.</p>
    </footer>
  </main>
</body>
</html>
`;

  return html.replace(/[ \t]+$/gm, "");
}
