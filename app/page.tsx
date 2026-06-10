import { buildNormalizedDailyLedger, type NormalizedDailyLedger } from "@/lib/health";
import { getDefaultRawHealthEventStore } from "@/lib/health/server-store";
import { buildTodayInteractionModel } from "@/lib/openclaw/health/interactions";

export const dynamic = "force-dynamic";

type CoverageStatus = "flowing" | "manual fallback" | "needs scale" | "planned";

interface CoverageItem {
  label: string;
  source: string;
  status: CoverageStatus;
}

function statusClass(status: CoverageStatus) {
  return status.replaceAll(" ", "-");
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function sourceCoverage(ledger: NormalizedDailyLedger): CoverageItem[] {
  return [
    {
      label: "Sleep + recovery",
      source: ledger.sleepHours || ledger.readinessScore ? "Oura / Apple Health ledger row" : "Waiting on Oura or Apple Health",
      status: ledger.sleepHours || ledger.readinessScore ? "flowing" : "planned"
    },
    {
      label: "Steps + active energy",
      source: ledger.steps || ledger.activeEnergyCalories ? "Wearable activity ledger row" : "Waiting on wearable sync",
      status: ledger.steps || ledger.activeEnergyCalories ? "flowing" : "planned"
    },
    {
      label: "Weight trend",
      source: ledger.weightKg ? `${ledger.weightKg.source} ledger row` : "Manual now, Withings tonight",
      status: ledger.weightKg ? "flowing" : "needs scale"
    },
    {
      label: "Meals + protein",
      source: ledger.meals.length ? "OpenClaw meal ledger rows" : "OpenClaw text/photo capture",
      status: ledger.meals.length ? "flowing" : "manual fallback"
    },
    {
      label: "Calorie calibration",
      source: ledger.weightTrendKgPerWeek && ledger.estimatedDeficitCalories ? "Weight trend + logged intake" : "Needs scale trend and meal consistency",
      status: ledger.weightTrendKgPerWeek && ledger.estimatedDeficitCalories ? "flowing" : "planned"
    }
  ];
}

function activeEndpoints() {
  return [
    {
      method: "GET",
      path: "/api/openclaw/health/daily-summary",
      note: "Assistant-safe body mode, missing signals, and source coverage."
    },
    {
      method: "GET",
      path: "/api/openclaw/health/today-plan",
      note: "Smallest useful check-ins for OpenClaw to ask over iMessage."
    },
    {
      method: "POST",
      path: "/api/openclaw/health/meals",
      note: "Trusted meal text/photo-reference ingestion with bounded validation."
    },
    {
      method: "POST",
      path: "/api/openclaw/health/weight",
      note: "Manual weight capture now; Withings can feed the same ledger shape later."
    }
  ];
}

function readiness(ledger: NormalizedDailyLedger) {
  return [
    ledger.rawEventIds.length
      ? "Live ledger rows are present; no sample health values are shown."
      : "No live rows yet; the cockpit stays empty instead of inventing Oura, meal, or weight values.",
    "OpenClaw is the primary interaction layer for meal and weight capture before direct vendor API setup.",
    "Withings should become the weight/body-composition source once the scale arrives tonight.",
    "Meal photo estimation should stay confidence-banded and correction-first before it drives coaching.",
    "Weekly calorie calibration starts only after enough weight trend and logged intake exist."
  ];
}

function bodyLedgerPlaceholders(ledger: NormalizedDailyLedger, coverageValue: string | undefined) {
  return [
    {
      id: "body-ledger-weight",
      label: "Weight",
      value: ledger.weightKg ? `${ledger.weightKg.value.toFixed(1)} kg` : "Missing",
      source: ledger.weightKg ? ledger.weightKg.source : "Manual row or Withings later"
    },
    {
      id: "body-ledger-meal",
      label: "Meals",
      value: ledger.meals.length ? `${ledger.meals.length}` : "Missing",
      source: ledger.meals.length ? "OpenClaw meal rows" : "OpenClaw capture path"
    },
    {
      id: "body-ledger-hrv",
      label: "HRV",
      value: ledger.hrvMs ? `${ledger.hrvMs.value} ms` : "Missing",
      source: ledger.hrvMs ? ledger.hrvMs.source : "Wearable source after sleep exists"
    },
    {
      id: "body-ledger-resting_heart_rate",
      label: "Resting HR",
      value: ledger.restingHeartRateBpm ? `${ledger.restingHeartRateBpm.value} bpm` : "Missing",
      source: ledger.restingHeartRateBpm ? ledger.restingHeartRateBpm.source : "Wearable source after sleep exists"
    },
    {
      id: "body-ledger-coverage",
      label: "Coverage",
      value: coverageValue ?? "0%",
      source: "Available normalized rows only"
    }
  ];
}

export default async function Home() {
  const date = todayKey();
  const events = await getDefaultRawHealthEventStore().list();
  const { ledger, bodyModeReasons } = buildNormalizedDailyLedger({ date, events });
  const today = buildTodayInteractionModel(ledger, bodyModeReasons);
  const coverageItems = sourceCoverage(ledger);
  const coverageValue = today.metricLinks.find((metric) => metric.label === "Coverage")?.value;
  const metricAnchorIds = new Set(today.metricLinks.map((metric) => `body-ledger-${metric.metric}`));
  const placeholderRows = bodyLedgerPlaceholders(ledger, coverageValue).filter((item) => !metricAnchorIds.has(item.id));

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <p className="eyebrow">Personal Health OS</p>
          <h1 id="hero-heading">A body ledger that stays empty until real signals land.</h1>
          <p className="lede">
            Health OS is the private control surface for OpenClaw meal capture, Withings weight trend,
            Oura/Apple recovery signals, and weekly calorie calibration. No direct vendor setup is
            required for this cockpit to tell the truth about what is present or missing.
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
            {placeholderRows.map((item) => (
              <div key={item.id} id={item.id} className="ledger-placeholder">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em>{item.source}</em>
              </div>
            ))}
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
                <span className={`coverage-mark coverage-mark--${statusClass(item.status)}`} />
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
            <h2>OpenClaw first</h2>
          </div>
          <div className="capture-stack">
            <div>
              <span className="capture-label">Meal</span>
              <p>Text/manual macros work now. Photo references should queue a low-confidence estimate until James confirms or corrects it.</p>
            </div>
            <div>
              <span className="capture-label">Weight</span>
              <p>Manual weight is enough today. Withings should write the same normalized weight/body-composition rows once connected.</p>
            </div>
          </div>
        </article>

        <article className="panel integration-panel">
          <div className="section-heading">
            <p className="eyebrow">OpenClaw</p>
            <h2>Active contracts</h2>
          </div>
          <p>
            The useful path is OpenClaw ingestion and assistant-safe summaries first. Direct Oura and
            Withings API setup can come after the ledger proves the daily loop.
          </p>
          <div className="endpoint-list">
            {activeEndpoints().map((endpoint) => (
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
            <h2>Scale + meal estimator path</h2>
          </div>
          <ul className="readiness-list">
            {readiness(ledger).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
