// Body Ledger — the "day row" exploded. Every metric shows source,
// confidence, and a story about how the system got that number.

function LedgerRow({ icon, label, value, unit, src, conf, story, sub }) {
  return (
    <div style={{ padding: '14px 4px', borderBottom: '1px solid var(--hair)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--paper-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
          <Icon name={icon} size={16} stroke={1.4} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--ink)' }}>{label}</span>
            <span className="hc-num" style={{ fontSize: 24, color: 'var(--ink)' }}>
              {value}
              {unit && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4, fontFamily: 'var(--mono)' }}>{unit}</span>}
            </span>
          </div>
          {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <SourceChip src={src} conf={conf} />
            <span className="hc-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: 0.04 }}>
              {conf === 'high' ? 'high confidence' : conf === 'med' ? 'medium' : 'low confidence'}
            </span>
          </div>
          {story && (
            <div style={{
              fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 8,
              padding: '8px 10px', background: 'var(--paper)', borderRadius: 8,
              borderLeft: '2px solid var(--hair-strong)',
            }}>{story}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScrLedgerInner({ onTab }) {
  return (
    <div className="hc-root" style={{ minHeight: '100%', paddingBottom: 96, background: 'var(--paper)' }}>
      {/* Header */}
      <div style={{ padding: '54px 20px 18px' }}>
        <div className="hc-cap" style={{ marginBottom: 4 }}>Body Ledger</div>
        <div className="hc-serif" style={{ fontSize: 28, lineHeight: 1.05, color: 'var(--ink)' }}>
          Mon, May 18 — one row in your body's book.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <button style={{ all: 'unset', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, color: 'var(--muted)' }}>
            <Icon name="chev" size={16} stroke={1.6} color="currentColor" />
          </button>
          <div style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'center' }}>
            {['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'].map((d, i) => {
              const active = i === 5;
              return (
                <div key={d} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '6px 8px',
                  borderRadius: 8,
                  background: active ? 'var(--ink)' : 'transparent',
                  color: active ? 'var(--paper)' : 'var(--muted)',
                  minWidth: 32,
                }}>
                  <span className="hc-mono" style={{ fontSize: 9, letterSpacing: 0.04 }}>{d}</span>
                  <span className="hc-serif" style={{ fontSize: 15 }}>{12 + i}</span>
                </div>
              );
            })}
          </div>
          <button style={{ all: 'unset', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, color: 'var(--muted)' }}>
            <Icon name="chev" size={16} stroke={1.6} color="currentColor" />
          </button>
        </div>
      </div>

      {/* Coverage banner */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{
          padding: 12, borderRadius: 12,
          background: 'var(--surface)', border: '1px solid var(--hair)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ position: 'relative', width: 36, height: 36 }}>
            <svg viewBox="0 0 36 36" width={36} height={36}>
              <circle cx="18" cy="18" r="14" fill="none" stroke="var(--hair-strong)" strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="var(--green)" strokeWidth="3"
                strokeDasharray={`${88 * 88 / 100} 88`} strokeLinecap="round" transform="rotate(-90 18 18)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="hc-mono" style={{ fontSize: 10, color: 'var(--ink)' }}>88</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--ink)' }}>Coverage today</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>Missing weight + dinner. Smart scale would close this loop.</div>
          </div>
        </div>
      </div>

      {/* Ledger rows */}
      <div style={{ padding: '8px 20px 0' }}>
        <SectionHead label="Sleep + recovery" right="overnight" />
        <div style={{ marginTop: 8 }}>
          <LedgerRow
            icon="moon"
            label="Sleep"
            value="6h 12m"
            unit=""
            src="Oura"
            conf="high"
            sub="22:48 → 05:00 · efficiency 89%"
            story="Short by 1h 04m vs. your 14-day baseline. Two wake-ups around 2 am."
          />
          <LedgerRow
            icon="heart"
            label="HRV (overnight)"
            value="38"
            unit="ms"
            src="Oura"
            conf="high"
            sub="14-day baseline 46 ms"
            story="Down 18%. Together with the short sleep, this is what flipped today to yellow."
          />
          <LedgerRow
            icon="heart"
            label="Resting HR"
            value="64"
            unit="bpm"
            src="Oura"
            conf="high"
            sub="+6 vs baseline 58"
            story="Elevated rHR usually trails sleep debt by a day. Should settle by Wed."
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <SectionHead label="Activity" right="iPhone + watch" />
        </div>
        <div style={{ marginTop: 8 }}>
          <LedgerRow
            icon="steps"
            label="Steps"
            value="2,140"
            unit=""
            src="iPhone"
            conf="high"
            sub="so far today · weekday avg 7,400"
          />
          <LedgerRow
            icon="flame"
            label="Active calories"
            value="≈ 280"
            unit="kcal"
            src="iPhone"
            conf="low"
            sub="estimate"
            story="Wearable calorie estimates are weak. I trust the weight trend more — it suggests your real daily burn is ~25% lower than the watch claims."
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <SectionHead label="Diet" right="from chat" />
        </div>
        <div style={{ marginTop: 8 }}>
          <LedgerRow
            icon="photo"
            label="Eaten"
            value="1,820"
            unit="kcal"
            src="photos"
            conf="med"
            sub="2 of 3 meals logged · ±220"
            story="Breakfast matched your saved 'regular breakfast'. Lunch was a new dish — I asked for portion size to narrow the estimate."
          />
          <LedgerRow
            icon="spark"
            label="Protein"
            value="92"
            unit="g"
            src="photos"
            conf="med"
            sub="goal 140 g · short by 48 g"
            story="Add 1 cup greek yogurt (~22g) or 4 oz chicken (~32g) to hit goal."
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <SectionHead label="Body" right="weight + composition" />
        </div>
        <div style={{ marginTop: 8 }}>
          <LedgerRow
            icon="scale"
            label="Weight"
            value="—"
            unit=""
            src="manual"
            conf="low"
            sub="last logged Sat · 184.2 lb"
            story="Two missed weigh-ins. Trend-confidence drops fast without daily data. A smart scale fixes this."
          />
        </div>

        {/* Footnote */}
        <div style={{ marginTop: 24, padding: '16px 4px', borderTop: '1px solid var(--hair)' }}>
          <div className="hc-cap" style={{ marginBottom: 6 }}>How the ledger works</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>
            Each metric stores the raw vendor reading, a normalized value, the source, and a confidence score.
            When sources disagree, I pick the one best at that metric. Solid lines mean high confidence; dashed and dotted lines mean less.
          </div>
        </div>
      </div>
    </div>
  );
}

window.ScrLedgerInner = ScrLedgerInner;
