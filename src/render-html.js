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
          <p class="eyebrow">Market tape</p>
          <h2>Odds and settlement surface</h2>
        </div>
        <p>Each market keeps the selection probabilities, movement from the previous snapshot, source age, and detected flags visible for fast judge review.</p>
      </div>
      <div class="markets">
        ${marketPanels(report.markets)}
      </div>
    </section>

    <footer>
      <p>Demo-data mode only. Live TxODDS integration should use the captured-payload normalizer or an adapter that emits the same feed shape after a safe API-token route exists. This page does not require a wallet, paid subscription, private key, seed phrase, or external network call.</p>
      <p>Machine-readable outputs: <a href="./report.json">fixture report JSON</a>, <a href="./txodds-capture-report.json">captured TxODDS report JSON</a>, and <a href="./replay-manifest.json">replay manifest JSON</a>.</p>
    </footer>
  </main>
</body>
</html>
`;

  return html.replace(/[ \t]+$/gm, "");
}
