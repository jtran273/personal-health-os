// Shared UI atoms for Health Copilot screens.
// Exposed on window so each screen file can use them.

// ─── Body Mode Orb ─────────────────────────────────────────────────────────
// A breathing organic shape. Color encodes mode; "fill" encodes how
// emphatically the mode applies. Subtle morphing path animates via SMIL.
function ModeOrb({ mode = 'yellow', size = 220, breathe = true }) {
  const cfg = {
    green:  { stroke: 'oklch(0.52 0.10 152)', fill: 'oklch(0.92 0.05 152 / .85)', inner: 'oklch(0.78 0.10 152 / .6)' },
    yellow: { stroke: 'oklch(0.55 0.10 65)',  fill: 'oklch(0.93 0.06 78 / .85)',  inner: 'oklch(0.80 0.10 78 / .65)' },
    red:    { stroke: 'oklch(0.48 0.14 28)',  fill: 'oklch(0.93 0.06 28 / .85)',  inner: 'oklch(0.74 0.13 28 / .55)' },
  }[mode];
  // Organic asymmetric blob path — two stable shapes we morph between.
  const p1 = "M50,12 C72,10 92,28 92,52 C92,74 76,90 54,92 C32,94 12,78 10,54 C8,32 28,14 50,12 Z";
  const p2 = "M52,10 C76,14 94,30 90,56 C86,80 68,92 46,90 C24,88 6,72 12,48 C18,26 30,8 52,10 Z";
  const p3 = "M48,14 C68,8 90,24 92,50 C94,78 74,92 50,90 C28,88 10,72 12,52 C14,30 30,18 48,14 Z";
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <radialGradient id={`grad-${mode}`} cx="40%" cy="38%" r="65%">
            <stop offset="0%" stopColor={cfg.inner} />
            <stop offset="100%" stopColor={cfg.fill} />
          </radialGradient>
          <filter id="soft"><feGaussianBlur stdDeviation="0.4"/></filter>
        </defs>
        <path d={p1} fill={`url(#grad-${mode})`} stroke={cfg.stroke} strokeWidth="0.6" filter="url(#soft)">
          {breathe && <animate attributeName="d" dur="9s" repeatCount="indefinite"
            values={`${p1};${p2};${p3};${p1}`} calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1" />}
        </path>
        {/* inner highlight ring */}
        <path d={p1} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" transform="translate(-1.5,-1.5) scale(0.96)">
          {breathe && <animate attributeName="d" dur="9s" repeatCount="indefinite"
            values={`${p1};${p2};${p3};${p1}`} />}
        </path>
      </svg>
    </div>
  );
}

// ─── Mode dot — small inline mode indicator ────────────────────────────────
function ModeDot({ mode = 'yellow', size = 8 }) {
  const c = mode === 'green' ? 'var(--green)' : mode === 'red' ? 'var(--red)' : 'var(--yellow)';
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 999, background: c, verticalAlign: 'middle' }} />;
}

// ─── Sparkline ─────────────────────────────────────────────────────────────
function Spark({ data = [], w = 60, h = 18, color = 'var(--ink-2)', fill = false, smooth = true, dot = true, conf = 'high' }) {
  const pts = data.filter(v => v != null);
  if (!pts.length) return <svg width={w} height={h} />;
  const min = Math.min(...pts), max = Math.max(...pts);
  const range = max - min || 1;
  const xs = data.map((_, i) => (i / (data.length - 1)) * (w - 4) + 2);
  const ys = data.map(v => v == null ? null : (h - 4) - ((v - min) / range) * (h - 8) + 2);
  // Build a path that breaks on nulls.
  let d = '', last = null;
  for (let i = 0; i < data.length; i++) {
    if (ys[i] == null) { last = null; continue; }
    if (last == null) d += `M${xs[i].toFixed(1)},${ys[i].toFixed(1)} `;
    else {
      if (smooth) {
        const cx = (xs[i-1] + xs[i]) / 2;
        d += `Q${cx.toFixed(1)},${ys[i-1].toFixed(1)} ${cx.toFixed(1)},${((ys[i-1]+ys[i])/2).toFixed(1)} T${xs[i].toFixed(1)},${ys[i].toFixed(1)} `;
      } else d += `L${xs[i].toFixed(1)},${ys[i].toFixed(1)} `;
    }
    last = i;
  }
  const dash = conf === 'low' ? '1 2' : conf === 'med' ? '3 2' : '0';
  // Last non-null index for end dot
  let endIdx = -1;
  for (let i = data.length - 1; i >= 0; i--) if (ys[i] != null) { endIdx = i; break; }
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <path d={`${d} L${xs[endIdx].toFixed(1)},${h} L${xs.find((_,i)=>ys[i]!=null).toFixed(1)},${h} Z`} fill={color} opacity="0.10" />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
      {dot && endIdx >= 0 && <circle cx={xs[endIdx]} cy={ys[endIdx]} r="2" fill={color} />}
    </svg>
  );
}

// ─── Source chip ───────────────────────────────────────────────────────────
function SourceChip({ src = 'Oura', conf = 'high' }) {
  return (
    <span className={`hc-src ${conf}`}>
      <span className="dot" />
      {src}
    </span>
  );
}

// ─── Metric tile ───────────────────────────────────────────────────────────
function MetricTile({ m, onClick }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '14px 14px 12px',
      borderRadius: 14,
      background: 'var(--surface)',
      border: '1px solid var(--hair)',
      minHeight: 96,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="hc-cap" style={{ fontSize: 9.5 }}>{m.label}</span>
        <SourceChip src={m.src} conf={m.conf} />
      </div>
      <div className="hc-num" style={{ fontSize: 30, color: 'var(--ink)' }}>
        {m.value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted)' }}>
          {m.delta}
        </span>
        <Spark data={m.trend} w={56} h={16} color="var(--ink-2)" conf={m.conf} />
      </div>
    </button>
  );
}

// ─── Section header (uppercased small caps + thin rule) ────────────────────
function SectionHead({ label, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
      <span className="hc-cap">{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
      {right && <span className="hc-cap" style={{ color: 'var(--ink-2)' }}>{right}</span>}
    </div>
  );
}

// ─── Icon set (minimal hairline icons) ─────────────────────────────────────
function Icon({ name, size = 18, color = 'currentColor', stroke = 1.4 }) {
  const s = { width: size, height: size, display: 'block', flexShrink: 0 };
  const base = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'walk': return <svg viewBox="0 0 24 24" style={s}><circle cx="14" cy="4.5" r="1.7" {...base}/><path d="M10 22l2-6 3-3-1-4-3 1-2 4M13 13l3 4 4 1M5 9l3-2 3 1" {...base}/></svg>;
    case 'moon': return <svg viewBox="0 0 24 24" style={s}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a0.5 0.5 0 0 0-.7-.5A9 9 0 1 0 20.5 15.2a0.5 0.5 0 0 0-.5-.7z" {...base}/></svg>;
    case 'spark': return <svg viewBox="0 0 24 24" style={s}><path d="M3 12c4 0 4-8 8-8s4 8 8 8-4 8-8 8-4-8-8-8z" {...base}/></svg>;
    case 'heart': return <svg viewBox="0 0 24 24" style={s}><path d="M12 21s-7-4.3-9-9c-1.2-2.8.6-6 3.5-6 1.9 0 3 .9 3.5 1.6.5-.7 1.6-1.6 3.5-1.6 2.9 0 4.7 3.2 3.5 6-2 4.7-9 9-9 9z" {...base}/></svg>;
    case 'steps': return <svg viewBox="0 0 24 24" style={s}><path d="M7 4c1.5 0 2.5 1 2.5 2.5S8.5 9 7 9 4.5 8 4.5 6.5 5.5 4 7 4zM5 11h4l-1 6-4 1zM17 8c1.5 0 2.5 1 2.5 2.5S18.5 13 17 13s-2.5-1-2.5-2.5S15.5 8 17 8zm-2 7h4l-1 5-4 1z" {...base}/></svg>;
    case 'photo': return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="5" width="18" height="14" rx="2" {...base}/><circle cx="9" cy="11" r="2" {...base}/><path d="M21 17l-6-5-9 7" {...base}/></svg>;
    case 'mic': return <svg viewBox="0 0 24 24" style={s}><rect x="9" y="3" width="6" height="12" rx="3" {...base}/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...base}/></svg>;
    case 'send': return <svg viewBox="0 0 24 24" style={s}><path d="M3 11l18-7-7 18-2-8z" {...base}/></svg>;
    case 'plus': return <svg viewBox="0 0 24 24" style={s}><path d="M12 5v14M5 12h14" {...base}/></svg>;
    case 'chev': return <svg viewBox="0 0 24 24" style={s}><path d="M9 6l6 6-6 6" {...base}/></svg>;
    case 'scale': return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="16" rx="3" {...base}/><path d="M8 11h8M12 8v6" {...base}/></svg>;
    case 'watch': return <svg viewBox="0 0 24 24" style={s}><rect x="6" y="6" width="12" height="12" rx="3" {...base}/><path d="M9 6V3h6v3M9 18v3h6v-3M12 10v2l2 1" {...base}/></svg>;
    case 'ring': return <svg viewBox="0 0 24 24" style={s}><ellipse cx="12" cy="13" rx="6" ry="7" {...base}/><path d="M10 3h4l-1 3h-2z" {...base}/></svg>;
    case 'cal': return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="5" width="18" height="16" rx="2" {...base}/><path d="M3 10h18M8 3v4M16 3v4" {...base}/></svg>;
    case 'lab': return <svg viewBox="0 0 24 24" style={s}><path d="M9 3v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V3M9 3h6" {...base}/></svg>;
    case 'phone': return <svg viewBox="0 0 24 24" style={s}><rect x="7" y="2" width="10" height="20" rx="2.5" {...base}/><circle cx="12" cy="18" r="0.8" fill={color}/></svg>;
    case 'apple': return <svg viewBox="0 0 24 24" style={s}><path d="M16 13c0-2 1.5-3 1.5-3-1-1.5-2.5-2-3.5-2-1.5 0-2.5.8-3 .8s-1.5-.8-3-.8c-2 0-4 1.5-4 5 0 3.5 2.5 8 4.5 8 1 0 1.5-.8 2.5-.8s1.5.8 2.5.8c2 0 3.5-3 4-4.5-2 0-1.5-3.5-1.5-3.5z" {...base}/><path d="M13.5 4c.5-1 .5-2.5 0-3-1 .5-1.5 2-1 3z" {...base}/></svg>;
    case 'check': return <svg viewBox="0 0 24 24" style={s}><path d="M5 12l4 4 10-10" {...base}/></svg>;
    case 'cross': return <svg viewBox="0 0 24 24" style={s}><path d="M6 6l12 12M18 6L6 18" {...base}/></svg>;
    case 'pencil': return <svg viewBox="0 0 24 24" style={s}><path d="M14 4l6 6L8 22H2v-6zM12 6l6 6" {...base}/></svg>;
    case 'flame': return <svg viewBox="0 0 24 24" style={s}><path d="M12 22c4 0 7-3 7-7 0-4-4-5-4-9 0 0-3 1-4 5-2-1-3-2-3-4 0 0-3 3-3 8s3 7 7 7z" {...base}/></svg>;
    case 'home': return <svg viewBox="0 0 24 24" style={s}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" {...base}/></svg>;
    case 'chat': return <svg viewBox="0 0 24 24" style={s}><path d="M4 5h16v11H8l-4 4z" {...base}/></svg>;
    case 'book': return <svg viewBox="0 0 24 24" style={s}><path d="M4 4h7v16H4zM13 4h7v16h-7z" {...base}/><path d="M4 8h7M4 12h7M4 16h7M13 8h7M13 12h7" {...base}/></svg>;
    case 'sun': return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="4" {...base}/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" {...base}/></svg>;
    case 'dots': return <svg viewBox="0 0 24 24" style={s}><circle cx="5" cy="12" r="1" fill={color}/><circle cx="12" cy="12" r="1" fill={color}/><circle cx="19" cy="12" r="1" fill={color}/></svg>;
    default: return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="8" {...base}/></svg>;
  }
}

// ─── Tab bar (bottom) ──────────────────────────────────────────────────────
function TabBar({ active = 'today', onChange }) {
  const tabs = [
    { id: 'today',  label: 'Today',  icon: 'sun' },
    { id: 'chat',   label: 'Copilot', icon: 'chat' },
    { id: 'ledger', label: 'Body',   icon: 'spark' },
    { id: 'week',   label: 'Weekly', icon: 'book' },
    { id: 'src',    label: 'Sources', icon: 'home' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingBottom: 18, paddingTop: 10, paddingLeft: 12, paddingRight: 12,
      background: 'linear-gradient(to top, var(--paper) 60%, rgba(246,241,232,0))',
      display: 'flex', justifyContent: 'space-around', gap: 4,
      zIndex: 30,
    }}>
      {tabs.map(t => {
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange && onChange(t.id)} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 12, minWidth: 56,
            color: on ? 'var(--ink)' : 'var(--faint)',
          }}>
            <Icon name={t.icon} size={20} stroke={on ? 1.6 : 1.3} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: 0.04, textTransform: 'uppercase' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Pull handle / status bar mini ─────────────────────────────────────────
function ScreenHead({ kicker, title, right }) {
  return (
    <div style={{ padding: '64px 20px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div className="hc-cap" style={{ marginBottom: 6 }}>{kicker}</div>
        <div className="hc-serif" style={{ fontSize: 30, lineHeight: 1.05, color: 'var(--ink)' }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

Object.assign(window, { ModeOrb, ModeDot, Spark, SourceChip, MetricTile, SectionHead, Icon, TabBar, ScreenHead });
