// Sources — show the "Body OS" ledger: where data flows in, coverage,
// confidence. This is the trust surface.

function SourceCard({ s }) {
  const statusColor = s.status === 'connected' ? 'var(--green)' : s.status === 'pending' ? 'var(--yellow)' : 'var(--faint)';
  const cov = Math.round(s.coverage * 100);
  return (
    <div className="hc-card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--paper-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', flexShrink: 0 }}>
          <Icon name={s.icon} size={20} stroke={1.4} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 500 }}>{s.name}</span>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: statusColor }} />
            <span className="hc-mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--muted)' }}>{s.status}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{s.role}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--paper-deep)', overflow: 'hidden' }}>
          <div style={{
            width: `${cov}%`, height: '100%',
            background: s.status === 'off' ? 'var(--hair-strong)' : 'var(--ink)',
            borderRadius: 999,
          }} />
        </div>
        <span className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)', minWidth: 36, textAlign: 'right' }}>
          {s.status === 'off' ? '—' : `${cov}%`}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.sub}</span>
        <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: 'var(--clay)', fontWeight: 500 }}>
          {s.status === 'connected' ? 'manage' : s.status === 'pending' ? 'finish setup' : 'connect →'}
        </button>
      </div>
    </div>
  );
}

function ScrSourcesInner({ onTab }) {
  const sources = window.SAMPLE.sources;
  const known = window.SAMPLE.knownFoods;

  // Group sources
  const connected = sources.filter(s => s.status === 'connected');
  const pending   = sources.filter(s => s.status === 'pending');
  const off       = sources.filter(s => s.status === 'off');

  return (
    <div className="hc-root" style={{ minHeight: '100%', paddingBottom: 96, background: 'var(--paper)' }}>
      {/* Header */}
      <div style={{ padding: '54px 20px 8px' }}>
        <div className="hc-cap" style={{ marginBottom: 4 }}>Body OS</div>
        <div className="hc-serif" style={{ fontSize: 30, lineHeight: 1.05, color: 'var(--ink)' }}>
          What's flowing in.
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.45, maxWidth: 320 }}>
          Each metric is routed to the source that's best at it. Add more devices and coverage rises automatically.
        </div>
      </div>

      {/* Coverage hero */}
      <div style={{ padding: '20px 16px 0' }}>
        <div className="hc-card" style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
              <svg viewBox="0 0 76 76" width={76} height={76}>
                <circle cx="38" cy="38" r="32" fill="none" stroke="var(--hair)" strokeWidth="5" />
                <circle cx="38" cy="38" r="32" fill="none" stroke="var(--ink)" strokeWidth="5"
                  strokeDasharray={`${(76 * 32 / 100) * 2 * Math.PI / 100 * 76 * 2 * Math.PI * 0}`}
                  style={{ strokeDasharray: `${2 * Math.PI * 32 * 0.76} ${2 * Math.PI * 32}` }}
                  strokeLinecap="round" transform="rotate(-90 38 38)" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="hc-serif" style={{ fontSize: 22, lineHeight: 1, color: 'var(--ink)' }}>76</span>
                <span className="hc-mono" style={{ fontSize: 8.5, color: 'var(--muted)', marginTop: 1 }}>%</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 500 }}>Coverage this week</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.45 }}>
                Adding a <strong style={{ color: 'var(--ink)' }}>smart scale</strong> would push you to ~92%.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric routing — the key idea */}
      <div style={{ padding: '24px 16px 0' }}>
        <SectionHead label="Metric routing" right="best per metric" />
        <div className="hc-card" style={{ marginTop: 12, padding: '4px 14px' }}>
          {[
            { m: 'Sleep & HRV',       src: 'Oura',   why: 'best at overnight signals' },
            { m: 'Resting HR',        src: 'Oura',   why: 'lowest error vs ECG' },
            { m: 'Workout HR',        src: 'iPhone', why: 'Apple Watch when added' },
            { m: 'Steps',             src: 'iPhone', why: 'Oura under-counts' },
            { m: 'Weight & trend',    src: 'manual', why: 'smart scale would automate' },
            { m: 'Calories burned',   src: 'iPhone', why: 'corrected by weight trend' },
            { m: 'Food intake',       src: 'photos', why: 'OpenClaw chat + known foods' },
            { m: 'Daily load',        src: 'Calendar', why: 'meeting density signal' },
          ].map((r, i, a) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: i < a.length - 1 ? '1px solid var(--hair)' : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>{r.m}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{r.why}</div>
              </div>
              <SourceChip src={r.src} conf="high" />
            </div>
          ))}
        </div>
      </div>

      {/* Sources list */}
      <div style={{ padding: '24px 16px 0' }}>
        <SectionHead label="Connected" right={`${connected.length}`} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {connected.map(s => <SourceCard key={s.name} s={s} />)}
        </div>
      </div>

      {pending.length > 0 && (
        <div style={{ padding: '24px 16px 0' }}>
          <SectionHead label="Pending" right={`${pending.length}`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {pending.map(s => <SourceCard key={s.name} s={s} />)}
          </div>
        </div>
      )}

      {off.length > 0 && (
        <div style={{ padding: '24px 16px 0' }}>
          <SectionHead label="Available" right={`${off.length}`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {off.map(s => <SourceCard key={s.name} s={s} />)}
          </div>
        </div>
      )}

      {/* Known foods */}
      <div style={{ padding: '24px 16px 0' }}>
        <SectionHead label="Known foods" right="learned from your chat" />
        <div className="hc-card" style={{ marginTop: 12, padding: '4px 14px' }}>
          {known.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
              borderBottom: i < known.length - 1 ? '1px solid var(--hair)' : 'none',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, oklch(0.85 0.05 70), oklch(0.78 0.06 50))', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{f.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                  {f.detail} · <span className="hc-mono">{f.kcal} kcal · {f.protein}g protein</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>logged</div>
                <div className="hc-serif" style={{ fontSize: 18, color: 'var(--ink)' }}>{f.count}×</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Principle footer */}
      <div style={{ padding: '24px 28px 8px', textAlign: 'center' }}>
        <p className="hc-serif" style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5, fontStyle: 'italic', margin: 0 }}>
          "Use each device for what it's good at. Never trust a single wearable as the full truth."
        </p>
      </div>
    </div>
  );
}

window.ScrSourcesInner = ScrSourcesInner;
