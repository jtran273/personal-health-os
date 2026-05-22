const coverageItems = [
  { label: "Sleep + recovery", source: "Apple Watch", status: "flowing" },
  { label: "Steps + active energy", source: "Apple Health", status: "flowing" },
  { label: "Weight trend", source: "Manual today, scale later", status: "needs scale" },
  { label: "Meals + protein", source: "OpenClaw text/photo", status: "manual fallback" },
  { label: "Calendar pressure", source: "Future calendar bridge", status: "planned" }
];

const endpoints = [
  {
    method: "GET",
    path: "/api/health/daily-ledger",
    note: "Sample normalized ledger and body-mode reasons."
  },
  {
    method: "GET/POST",
    path: "/api/health/meals",
    note: "OpenClaw meal capture contract stub."
  },
  {
    method: "POST",
    path: "/api/integrations/oura/sync",
    note: "Dormant Oura sync path; useful as provider-pattern reference."
  }
];

const readiness = [
  "HealthKit source attribution for Apple Watch vs iPhone vs future scale",
  "Smart-scale import path using the same weight ledger shape",
  "OpenClaw ingestion token validation before persistence",
  "Weekly calorie recalibration once weight and meal rows are durable"
];

export default function Home() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <p className="eyebrow">Personal Health OS</p>
          <h1 id="hero-heading">Today runs on body mode, coverage, and the next missing signal.</h1>
          <p className="lede">
            A simple operator surface for James and future agents: see what the body mode says,
            which sources are flowing, what OpenClaw can capture next, and what still needs wiring.
          </p>
        </div>

        <aside className="mode-card" aria-labelledby="mode-heading">
          <div className="mode-card__topline">
            <span className="status-dot" aria-hidden="true" />
            <span>Today</span>
          </div>
          <h2 id="mode-heading">Yellow mode</h2>
          <p>Preserve the routine. Walk at lunch, keep protein visible, and avoid intensity until recovery fills in.</p>
          <dl className="metrics-strip">
            <div>
              <dt>Sleep</dt>
              <dd>7.1h</dd>
            </div>
            <div>
              <dt>Readiness</dt>
              <dd>72</dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>68%</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="dashboard-grid" aria-label="Health OS control surface">
        <article className="panel coverage-panel">
          <div className="section-heading">
            <p className="eyebrow">Source coverage</p>
            <h2>What is flowing in</h2>
          </div>
          <ul className="coverage-list">
            {coverageItems.map((item) => (
              <li key={item.label}>
                <span className={`coverage-mark coverage-mark--${item.status.replaceAll(" ", "-")}`} />
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.source}</p>
                </div>
                <span>{item.status}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel capture-panel">
          <div className="section-heading">
            <p className="eyebrow">Capture</p>
            <h2>Smallest useful asks</h2>
          </div>
          <div className="capture-stack">
            <div>
              <span className="capture-label">Meal</span>
              <p>OpenClaw can accept text now: "chicken bowl 650 kcal 42g protein". Photo estimation is the next live path.</p>
            </div>
            <div>
              <span className="capture-label">Weight</span>
              <p>Manual weight is enough for calibration today. Smart scale support should feed the same normalized weight row.</p>
            </div>
          </div>
        </article>

        <article className="panel integration-panel">
          <div className="section-heading">
            <p className="eyebrow">OpenClaw</p>
            <h2>Integration status</h2>
          </div>
          <p>
            Current API routes are contract stubs. Next useful work is trusted ingestion, persistence,
            then a daily summary endpoint that OpenClaw can send over iMessage.
          </p>
          <div className="endpoint-list">
            {endpoints.map((endpoint) => (
              <div key={endpoint.path}>
                <code>{endpoint.method}</code>
                <strong>{endpoint.path}</strong>
                <span>{endpoint.note}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel readiness-panel">
          <div className="section-heading">
            <p className="eyebrow">Ready next</p>
            <h2>Apple Watch + scale path</h2>
          </div>
          <ul className="readiness-list">
            {readiness.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
