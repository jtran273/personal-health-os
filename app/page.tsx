import { buildSampleOpenClawLedger } from "@/lib/openclaw/health";
import { buildTodayInteractionModel } from "@/lib/openclaw/health/interactions";

const sampleLedger = buildSampleOpenClawLedger(new Date("2026-05-21T15:30:00.000Z"));
const today = buildTodayInteractionModel(sampleLedger);

const coverageItems = [
  { label: "Sleep + recovery", source: "Apple Watch / Apple Health", status: "flowing" },
  { label: "Steps + active energy", source: "Apple Health", status: "flowing" },
  { label: "Weight trend", source: "Manual today, scale later", status: "needs scale" },
  { label: "Meals + protein", source: "OpenClaw text/photo", status: "manual fallback" },
  { label: "Calendar pressure", source: "Future calendar bridge", status: "planned" }
];

const endpoints = [
  {
    method: "GET",
    path: "/api/health/daily-ledger",
    note: "Normalized ledger, body-mode reasons, and safe Body Ledger context."
  },
  {
    method: "GET/POST",
    path: "/api/health/meals",
    note: "OpenClaw meal capture contract stub."
  },
  {
    method: "POST",
    path: "/api/integrations/oura/sync",
    note: "Dormant Oura sync path; fallback only, not auto-ingested because a token exists."
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
            why it says it, and which safe capture path should happen next.
          </p>
          <div className="hero-actions" aria-label="Today actions">
            <a className="button button--primary" href={today.primaryAction.href}>{today.primaryAction.label}</a>
            <a className="button" href={today.secondaryAction.href}>{today.secondaryAction.label}</a>
          </div>
        </div>

        <aside className="mode-card" aria-labelledby="mode-heading">
          <div className="mode-card__topline">
            <span className="status-dot" aria-hidden="true" />
            <span>{today.date}</span>
          </div>
          <h2 id="mode-heading">{today.mode[0].toUpperCase() + today.mode.slice(1)} mode</h2>
          <p>{today.planCopy}</p>
          <dl className="metrics-strip">
            {today.metricLinks.slice(0, 3).map((metric) => (
              <div key={metric.metric}>
                <a href={metric.href} aria-label={metric.copy}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </a>
              </div>
            ))}
          </dl>
        </aside>
      </section>

      <section className="dashboard-grid" aria-label="Health OS control surface">
        <article className="panel today-panel" id="today-plan">
          <div className="section-heading">
            <p className="eyebrow">Today plan</p>
            <h2>{today.planHeadline}</h2>
          </div>
          <p>{today.planCopy}</p>
          <div className="action-list" aria-label="Missing-signal prompts">
            {today.missingSignals.map((prompt) => (
              <a key={prompt.signal} href={prompt.href}>
                <strong>{prompt.label}</strong>
                <span>{prompt.copy}</span>
              </a>
            ))}
          </div>
          <p className="safe-copy">{today.dataStateCopy}</p>
        </article>

        <article className="panel why-panel" id="why-this-mode">
          <div className="section-heading">
            <p className="eyebrow">Why this</p>
            <h2>Recommendation from ledger inputs</h2>
          </div>
          <p>{today.explanation}</p>
          <div className="ledger-row-list" aria-label="Body Ledger metric links">
            {today.metricLinks.map((metric) => (
              <a key={metric.metric} id={`body-ledger-${metric.metric}`} href={metric.href}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <em>{metric.source}</em>
              </a>
            ))}
            <div id="body-ledger-weight" className="ledger-placeholder">
              <span>Weight</span>
              <strong>Missing</strong>
              <em>Manual Body Ledger row or smart scale later</em>
            </div>
            <div id="body-ledger-hrv" className="ledger-placeholder">
              <span>HRV</span>
              <strong>Missing</strong>
              <em>Check wearable permissions after sleep exists</em>
            </div>
            <div id="body-ledger-resting_heart_rate" className="ledger-placeholder">
              <span>Resting HR</span>
              <strong>Missing</strong>
              <em>Check wearable permissions after sleep exists</em>
            </div>
            <div id="body-ledger-coverage" className="ledger-placeholder">
              <span>Coverage</span>
              <strong>{today.metricLinks.find((metric) => metric.label === "Coverage")?.value}</strong>
              <em>Available normalized rows only</em>
            </div>
          </div>
        </article>

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
