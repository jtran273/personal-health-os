// Weekly Review — the calibration story.
// The chart that matters: estimated calorie deficit vs. observed weight trend.

function CalibrationChart({ days, weightTrend, deficitEst }) {
  const W = 320, H = 160, PAD = { l: 8, r: 8, t: 8, b: 24 };
  // Build two scales.
  const wMin = Math.min(...weightTrend), wMax = Math.max(...weightTrend);
  const wR = (wMax - wMin) || 1;
  const dMin = Math.min(...deficitEst), dMax = Math.max(...deficitEst);
  const dR = Math.max(Math.abs(dMin), Math.abs(dMax)) || 1;

  const xs = days.map((_, i) => PAD.l + (i / (days.length - 1)) * (W - PAD.l - PAD.r));
  const wYs = weightTrend.map(v => PAD.t + ((wMax - v) / wR) * (H - PAD.t - PAD.b));
  // Deficit as bars (negative = below zero line)
  const zeroY = PAD.t + (H - PAD.t - PAD.b) / 2;
  const barH = (val) => Math.abs(val) / dR * ((H - PAD.t - PAD.b) / 2);

  let wPath = '';
  for (let i = 0; i < days.length; i++) {
    if (i === 0) wPath += `M${xs[i]},${wYs[i]} `;
    else {
      const cx = (xs[i-1] + xs[i]) / 2;
      wPath += `Q${cx},${wYs[i-1]} ${cx},${(wYs[i-1]+wYs[i])/2} T${xs[i]},${wYs[i]} `;
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      {/* zero/baseline */}
      <line x1={PAD.l} y1={zeroY} x2={W - PAD.r} y2={zeroY} stroke="var(--hair)" strokeWidth="1" strokeDasharray="2 3" />
      {/* deficit bars */}
      {deficitEst.map((d, i) => {
        const x = xs[i] - 8;
        const h = barH(d);
        return (
          <rect key={i} x={x} y={d < 0 ? zeroY : zeroY - h} width={16} height={h}
            rx={3} fill={d < 0 ? 'var(--clay-soft)' : 'var(--green-soft)'}
            stroke={d < 0 ? 'var(--clay)' : 'var(--green)'} strokeWidth="0.7" opacity="0.85" />
        );
      })}
      {/* weight trend line */}
      <path d={wPath} fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {weightTrend.map((v, i) => (
        <g key={i}>
          <circle cx={xs[i]} cy={wYs[i]} r="2.6" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.4" />
        </g>
      ))}
      {/* x labels */}
      {days.map((d, i) => (
        <text key={d} x={xs[i]} y={H - 6} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--muted)">{d}</text>
      ))}
    </svg>
  );
}

function ScrWeekInner({ onTab }) {
  const w = window.SAMPLE.weekly;
  return (
    <div className="hc-root" style={{ minHeight: '100%', paddingBottom: 96, background: 'var(--paper)' }}>
      {/* Header */}
      <div style={{ padding: '54px 20px 8px' }}>
        <div className="hc-cap" style={{ marginBottom: 4 }}>Weekly review · Week 20</div>
        <div className="hc-serif" style={{ fontSize: 30, lineHeight: 1.05, color: 'var(--ink)' }}>May 12 — May 18</div>
      </div>

      {/* Headline */}
      <div style={{ padding: '14px 20px 20px' }}>
        <p className="hc-serif" style={{ fontSize: 20, lineHeight: 1.3, color: 'var(--ink-2)', margin: 0 }}>
          {w.headline}
        </p>
      </div>

      {/* The calibration chart */}
      <div style={{ padding: '0 16px' }}>
        <div className="hc-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="hc-cap" style={{ color: 'var(--ink-2)' }}>Deficit vs. weight trend</span>
            <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span className="hc-num" style={{ fontSize: 36, color: 'var(--ink)' }}>−0.9</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>lb this week</span>
          </div>
          <CalibrationChart days={w.days} weightTrend={w.weightTrend} deficitEst={w.deficitEst} />
          <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 2, background: 'var(--ink)', display: 'inline-block' }} />
              <span className="hc-mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>weight, lb</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: 'var(--clay-soft)', border: '1px solid var(--clay)', borderRadius: 2, display: 'inline-block' }} />
              <span className="hc-mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>daily deficit, kcal</span>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: 12, background: 'var(--paper)', borderRadius: 10, borderLeft: '2px solid var(--clay)' }}>
            <div className="hc-cap" style={{ marginBottom: 4, color: 'var(--clay)' }}>I recalibrated</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{w.insight}</div>
          </div>
        </div>
      </div>

      {/* Wins / Misses */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="hc-card" style={{ padding: 14 }}>
            <div className="hc-cap" style={{ color: 'var(--green)', marginBottom: 8 }}>Held</div>
            {w.wins.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: i === 0 ? 0 : 8 }}>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--green)', marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>{s}</span>
              </div>
            ))}
          </div>
          <div className="hc-card" style={{ padding: 14 }}>
            <div className="hc-cap" style={{ color: 'var(--clay)', marginBottom: 8 }}>Slipped</div>
            {w.misses.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: i === 0 ? 0 : 8 }}>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--clay)', marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sleep + protein mini charts */}
      <div style={{ padding: '20px 16px 0' }}>
        <div className="hc-card" style={{ padding: 14 }}>
          <div className="hc-cap" style={{ marginBottom: 10 }}>The week in two lines</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Sleep, hours</span>
                <span className="hc-mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>avg 6.9</span>
              </div>
              <Spark data={w.sleepHrs} w={300} h={28} color="var(--ink)" fill smooth={true} conf="high" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Protein, grams</span>
                <span className="hc-mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>avg 106 · goal 140</span>
              </div>
              <Spark data={w.proteinG} w={300} h={28} color="var(--clay)" fill smooth={true} conf="med" />
            </div>
          </div>
        </div>
      </div>

      {/* Next week plan */}
      <div style={{ padding: '20px 16px 0' }}>
        <SectionHead label="Next week, automatically" right="3 decisions" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {w.nextWeek.map((s, i) => (
            <div key={i} className="hc-card" style={{ padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--paper-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="hc-serif" style={{ fontSize: 13, color: 'var(--ink)' }}>{i + 1}</span>
              </div>
              <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.45, paddingTop: 4 }}>{s}</div>
              <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', paddingTop: 4 }}>edit</button>
            </div>
          ))}
        </div>
        <button style={{
          all: 'unset', cursor: 'pointer',
          display: 'block', textAlign: 'center', width: '100%',
          padding: '14px 16px', marginTop: 14,
          borderRadius: 14, background: 'var(--ink)', color: 'var(--paper)',
          fontSize: 14, fontWeight: 500,
        }}>Approve plan for week 21</button>
      </div>
    </div>
  );
}

window.ScrWeekInner = ScrWeekInner;
