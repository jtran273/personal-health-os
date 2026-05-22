// Today — daily briefing. Mode + one action + open loops + metrics + timeline.

function ScrTodayInner({ onTab }) {
  const t = window.SAMPLE.today;
  const modeColor = t.mode === 'green' ? 'var(--green)' : t.mode === 'red' ? 'var(--red)' : 'var(--yellow)';
  const modeSoft  = t.mode === 'green' ? 'var(--green-soft)' : t.mode === 'red' ? 'var(--red-soft)' : 'var(--yellow-soft)';

  return (
    <div className="hc-root" style={{ minHeight: '100%', paddingBottom: 96, background: 'var(--paper)' }}>
      {/* Top header — date + mode */}
      <div style={{ padding: '54px 20px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="hc-cap" style={{ marginBottom: 4 }}>Today</div>
          <div className="hc-serif" style={{ fontSize: 26, lineHeight: 1.0, color: 'var(--ink)' }}>{t.dateLabel}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 8px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--hair)' }}>
          <ModeDot mode={t.mode} size={9} />
          <span className="hc-mono" style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--ink-2)', letterSpacing: 0.08 }}>{t.mode}</span>
        </div>
      </div>

      {/* Hero: Mode orb + headline */}
      <div style={{ padding: '20px 20px 8px', position: 'relative' }}>
        <div style={{ position: 'relative', height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ModeOrb mode={t.mode} size={240} />
          </div>
          {/* Centered headline overlays the orb */}
          <div style={{ position: 'relative', textAlign: 'center', maxWidth: 280, padding: '0 12px' }}>
            <div className="hc-serif" style={{ fontSize: 32, lineHeight: 1.05, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
              {t.headline}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 6, padding: '0 24px' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>{t.modeReason}</span>
        </div>
      </div>

      {/* One useful action */}
      <div style={{ padding: '20px 16px 0' }}>
        <div className="hc-card" style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 999, background: modeSoft, filter: 'blur(20px)', opacity: 0.7 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="hc-cap" style={{ color: 'var(--ink-2)' }}>The one thing</span>
              <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
              <span className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{t.oneAction.window}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: modeSoft, color: modeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={t.oneAction.icon} size={24} stroke={1.6} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="hc-serif" style={{ fontSize: 22, lineHeight: 1.15, color: 'var(--ink)' }}>{t.oneAction.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.45 }}>{t.oneAction.why}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="hc-btn-primary" style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', padding: '11px 16px', borderRadius: 12, background: 'var(--ink)', color: 'var(--paper)', fontSize: 14, fontWeight: 500 }}>
                Plan it
              </button>
              <button style={{ all: 'unset', cursor: 'pointer', padding: '11px 16px', borderRadius: 12, background: 'transparent', border: '1px solid var(--hair-strong)', color: 'var(--ink-2)', fontSize: 14 }}>
                Why this?
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Open loops — what the system needs from you */}
      {t.openLoops.length > 0 && (
        <div style={{ padding: '20px 20px 0' }}>
          <SectionHead label="Open loops" right={`${t.openLoops.length}`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {t.openLoops.map(l => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: 'var(--surface)', border: '1px solid var(--hair)',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--clay)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)' }}>{l.label}</div>
                  <div className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{l.since}</div>
                </div>
                <button onClick={() => onTab && onTab('chat')} style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: 'var(--clay)', fontWeight: 500 }}>
                  {l.cta} <span style={{ marginLeft: 2 }}>→</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionHead label="Today, so far" right="Tap any" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          {t.metrics.map(m => <MetricTile key={m.key} m={m} onClick={() => onTab && onTab('ledger')} />)}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionHead label="Day, in order" />
        <div style={{ position: 'relative', marginTop: 14, paddingLeft: 18 }}>
          <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 1, background: 'var(--hair)' }} />
          {t.timeline.map((ev, i) => (
            <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 16 }}>
              <div style={{ position: 'absolute', left: -18, top: 5, width: 11, height: 11, borderRadius: 999, background: 'var(--paper)', border: '1.5px solid var(--ink-2)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{ev.t}</span>
                  <SourceChip src={ev.src} conf="high" />
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 3 }}>{ev.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div style={{ padding: '18px 28px 8px', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--faint)', fontStyle: 'italic' }}>
          Synced 2 min ago. Coverage today 88%.
        </span>
      </div>
    </div>
  );
}

window.ScrTodayInner = ScrTodayInner;
