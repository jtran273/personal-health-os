const endpoints = [
  "/api/health/daily-ledger",
  "/api/health/meals",
  "/api/integrations/oura/sync"
];

export default function Home() {
  return (
    <main className="shell">
      <section className="intro">
        <p className="eyebrow">Personal Health OS</p>
        <h1>Body and diet foundation for OpenClaw.</h1>
        <p>
          Placeholder app shell for meal capture, wearable ingestion, daily ledgers, and
          body-mode decisions. The designed frontend can replace this surface while keeping
          the backend contracts stable.
        </p>
      </section>

      <section className="panel" aria-labelledby="status-heading">
        <h2 id="status-heading">Foundation</h2>
        <dl>
          <div>
            <dt>Ledger</dt>
            <dd>Source-agnostic normalized daily health model.</dd>
          </div>
          <div>
            <dt>Routing</dt>
            <dd>Oura for recovery, watches for activity, scale/manual for weight.</dd>
          </div>
          <div>
            <dt>Calories</dt>
            <dd>Weak wearable prior, recalibrated against weight trend.</dd>
          </div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="api-heading">
        <h2 id="api-heading">API placeholders</h2>
        <ul>
          {endpoints.map((endpoint) => (
            <li key={endpoint}>
              <code>{endpoint}</code>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
