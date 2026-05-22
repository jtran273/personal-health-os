// Desktop "Operator" view — the same data, presented as a calm command
// surface. Three-column: left rail (status), middle (today + plan), right
// (conversation with OpenClaw).

function DesktopOperator() {
  const t = window.SAMPLE.today;
  const w = window.SAMPLE.weekly;
  return (
    <div className="hc-root" style={{ width: 1280, height: 800, background: 'var(--paper)', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 12 }}>
      {/* Top bar */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid var(--hair)', background: 'var(--surface-2)', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--paper)', fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1 }}>O</div>
          <span className="hc-serif" style={{ fontSize: 16, color: 'var(--ink)' }}>OpenClaw <span style={{ color: 'var(--muted)', fontFamily: 'var(--sans)', fontSize: 13 }}>/ Body</span></span>
        </div>
        <nav style={{ display: 'flex', gap: 2, marginLeft: 24 }}>
          {['Body', 'Diet', 'Finance', 'Calendar'].map((tab, i) => (
            <button key={tab} style={{
              all: 'unset', cursor: 'pointer',
              padding: '6px 12px', borderRadius: 7,
              fontSize: 13, color: i === 0 ? 'var(--ink)' : 'var(--muted)',
              background: i === 0 ? 'var(--paper-deep)' : 'transparent',
              fontWeight: i === 0 ? 500 : 400,
            }}>{tab}</button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 999, background: 'var(--paper-deep)' }}>
          <ModeDot mode={t.mode} size={8} />
          <span className="hc-mono" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-2)' }}>{t.mode} day</span>
        </div>
        <button style={{ all: 'unset', cursor: 'pointer', padding: '6px 8px', color: 'var(--muted)' }}>
          <Icon name="dots" size={18} />
        </button>
        <div style={{ width: 30, height: 30, borderRadius: 999, background: 'linear-gradient(135deg, var(--clay), oklch(0.50 0.10 30))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--paper)', fontSize: 12, fontWeight: 500 }}>J</div>
      </div>

      {/* Body: three columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 360px', minHeight: 0 }}>

        {/* Left rail */}
        <aside style={{ borderRight: '1px solid var(--hair)', padding: '20px 16px', overflow: 'auto', background: 'var(--surface-2)' }}>
          <div className="hc-cap" style={{ marginBottom: 10 }}>Today</div>
          <div className="hc-serif" style={{ fontSize: 22, color: 'var(--ink)', lineHeight: 1.05 }}>{t.dateLabel}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{t.modeReason}</div>

          <div style={{ marginTop: 24 }}>
            <div className="hc-cap" style={{ marginBottom: 8 }}>Body mode</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ModeOrb mode={t.mode} size={68} />
              <div>
                <div className="hc-serif" style={{ fontSize: 18, lineHeight: 1.1, color: 'var(--ink)', textTransform: 'capitalize' }}>{t.mode}</div>
                <div className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>recover, don't push</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div className="hc-cap" style={{ marginBottom: 10 }}>Open loops</div>
            {t.openLoops.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--hair)' }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--clay)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{l.label}</div>
                  <div className="hc-mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>{l.since}</div>
                </div>
                <button style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: 'var(--clay)' }}>{l.cta}</button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24 }}>
            <div className="hc-cap" style={{ marginBottom: 10 }}>Sources</div>
            {window.SAMPLE.sources.filter(s => s.status !== 'off').slice(0, 5).map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <Icon name={s.icon} size={14} color="var(--ink-2)" />
                <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-2)' }}>{s.name}</span>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: s.status === 'connected' ? 'var(--green)' : 'var(--yellow)' }} />
              </div>
            ))}
          </div>
        </aside>

        {/* Middle column — the heart */}
        <main style={{ overflow: 'auto', padding: '24px 28px' }}>
          {/* The one thing */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ flex: 1 }}>
              <div className="hc-cap" style={{ marginBottom: 6 }}>The one thing</div>
              <h1 className="hc-serif" style={{ margin: 0, fontSize: 44, lineHeight: 1.05, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
                {t.oneAction.title}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5, maxWidth: 540 }}>
                {t.oneAction.why}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button style={{ all: 'unset', cursor: 'pointer', padding: '9px 16px', borderRadius: 10, background: 'var(--ink)', color: 'var(--paper)', fontSize: 13, fontWeight: 500 }}>
                  Plan it · {t.oneAction.window}
                </button>
                <button style={{ all: 'unset', cursor: 'pointer', padding: '9px 14px', borderRadius: 10, background: 'transparent', border: '1px solid var(--hair-strong)', fontSize: 13, color: 'var(--ink-2)' }}>
                  Why this?
                </button>
                <button style={{ all: 'unset', cursor: 'pointer', padding: '9px 14px', borderRadius: 10, fontSize: 13, color: 'var(--muted)' }}>
                  Show alternatives
                </button>
              </div>
            </div>
          </div>

          {/* Metrics row */}
          <div style={{ marginTop: 32 }}>
            <SectionHead label="Today, so far" right="all sources reconciled" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
              {t.metrics.slice(0, 8).map(m => <MetricTile key={m.key} m={m} />)}
            </div>
          </div>

          {/* Calibration chart preview */}
          <div style={{ marginTop: 32 }}>
            <SectionHead label="Week 20 in motion" right="updated 2 min ago" />
            <div className="hc-card" style={{ marginTop: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span className="hc-num" style={{ fontSize: 44, color: 'var(--ink)', lineHeight: 1 }}>−0.9</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>lb · 7-day trend</span>
                  </div>
                  <p className="hc-serif" style={{ fontSize: 16, color: 'var(--ink-2)', margin: '10px 0 0', lineHeight: 1.35, maxWidth: 460 }}>
                    {w.headline}
                  </p>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--paper)', border: '1px solid var(--hair)', maxWidth: 240 }}>
                  <div className="hc-cap" style={{ color: 'var(--clay)', marginBottom: 4 }}>Recalibrated</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>Wearable overcounts burn by ~25%. Math now matches the scale.</div>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <CalibrationChart days={w.days} weightTrend={w.weightTrend} deficitEst={w.deficitEst} />
              </div>
            </div>
          </div>

          {/* Next week */}
          <div style={{ marginTop: 32, marginBottom: 16 }}>
            <SectionHead label="Decisions queued for next week" right="3" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
              {w.nextWeek.map((s, i) => (
                <div key={i} className="hc-card" style={{ padding: 14 }}>
                  <div className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.4 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Right — Copilot rail */}
        <aside style={{ borderLeft: '1px solid var(--hair)', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)' }}>
          <div style={{ padding: '20px 18px 12px', borderBottom: '1px solid var(--hair)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="hc-cap" style={{ color: 'var(--ink-2)' }}>OpenClaw</div>
              <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
              <span className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>quiet · live</span>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--hair)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Slept <strong>6h 12m</strong>. HRV down 18%. I set today to yellow.
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--hair)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              One thing: <span style={{ color: 'var(--clay)' }}>skip the lift, walk 25 min at lunch.</span>
            </div>
            <div style={{ alignSelf: 'flex-end', padding: '10px 14px', borderRadius: 14, background: 'var(--ink)', color: 'var(--paper)', fontSize: 13, maxWidth: '85%' }}>
              ok. weigh-in?
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--hair)', fontSize: 13, color: 'var(--ink-2)' }}>
              Step on. I'll read the scale.
            </div>
            <div style={{ alignSelf: 'flex-end', padding: '10px 14px', borderRadius: 14, background: 'var(--ink)', color: 'var(--paper)', fontSize: 13 }}>
              184.0
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--hair)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="hc-serif" style={{ fontSize: 22, lineHeight: 1 }}>184.0<span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 3 }}>lb</span></span>
                <Spark data={[185.6,185.2,184.9,184.8,184.6,184.4,184.0]} w={100} h={20} color="var(--clay)" />
              </div>
              <div className="hc-mono" style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 4 }}>−0.9 lb · 7d trend</div>
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--hair)', fontSize: 13, color: 'var(--ink-2)' }}>
              Walk window in 12 min. <span className="hc-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>68°F, clear</span>
            </div>
          </div>
          <div style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--hair)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper)', border: '1px solid var(--hair-strong)', borderRadius: 999, padding: '5px 5px 5px 12px' }}>
              <input placeholder="Tell OpenClaw…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'var(--sans)' }} />
              <button style={{ all: 'unset', cursor: 'pointer', color: 'var(--muted)', padding: 6 }}><Icon name="photo" size={16} /></button>
              <button style={{ all: 'unset', cursor: 'pointer', width: 30, height: 30, borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="mic" size={14} stroke={1.6} />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

window.DesktopOperator = DesktopOperator;
