// ───────────────────────────────────────────────────────────────────────────
// Design System doc — Body OS
// Mobile-first (iOS / SwiftUI primary), web (React / CSS) secondary.
// ───────────────────────────────────────────────────────────────────────────

const { useState } = React;

// Helpers ────────────────────────────────────────────────────────────────────
function CodeBlock({ children }) {
  return <pre className="ds-code" dangerouslySetInnerHTML={{ __html: children }} />;
}

function PlatformTabs({ swift, web }) {
  const [tab, setTab] = useState('swift');
  return (
    <div>
      <div className="ds-tab-row">
        <div className={`ds-tab ${tab === 'swift' ? 'is-active' : ''}`} onClick={() => setTab('swift')}>SwiftUI</div>
        <div className={`ds-tab ${tab === 'web' ? 'is-active' : ''}`} onClick={() => setTab('web')}>Web · React</div>
      </div>
      {tab === 'swift' ? <CodeBlock>{swift}</CodeBlock> : <CodeBlock>{web}</CodeBlock>}
    </div>
  );
}

// Color palette ──────────────────────────────────────────────────────────────
const PALETTE = [
  { name: 'Paper',          tok: '--paper',         val: '#f6f1e8', use: 'App background. Calm, warm, paper-like.' },
  { name: 'Paper deep',     tok: '--paper-deep',    val: '#ede6d8', use: 'Subtle wells, chip backgrounds.' },
  { name: 'Surface',        tok: '--surface',       val: '#fbf7f0', use: 'Cards. Slight lift above paper.' },
  { name: 'Surface 2',      tok: '--surface-2',     val: '#fdfaf3', use: 'Nested surfaces, system bubbles.' },
  { name: 'Ink',            tok: '--ink',           val: '#1e1b16', use: 'Headlines, primary text, primary CTAs.' },
  { name: 'Ink 2',          tok: '--ink-2',         val: '#3a342c', use: 'Body text.' },
  { name: 'Muted',          tok: '--muted',         val: '#6b6358', use: 'Secondary text, captions, units.' },
  { name: 'Faint',          tok: '--faint',         val: '#a39a8c', use: 'Tertiary, disabled, timestamps.' },
];

const MODE_COLORS = [
  { name: 'Green',  tok: '--green',  desc: 'Recovered, push permitted.',     css: 'oklch(0.58 0.08 152)', softTok: '--green-soft',  softCss: 'oklch(0.92 0.04 152)' },
  { name: 'Yellow', tok: '--yellow', desc: 'Caution, protect recovery.',     css: 'oklch(0.74 0.10 78)',  softTok: '--yellow-soft', softCss: 'oklch(0.93 0.05 78)' },
  { name: 'Red',    tok: '--red',    desc: 'Reduce load, sleep first.',      css: 'oklch(0.55 0.14 28)',  softTok: '--red-soft',    softCss: 'oklch(0.93 0.05 28)' },
];

function ColorSwatch({ name, tok, val, use, big }) {
  return (
    <div>
      <div className="ds-swatch" style={{ '--c': val, aspectRatio: big ? '5/3' : '4/3' }} />
      <div className="ds-swatch-meta">
        <span className="ds-swatch-name">{name}</span>
        <span className="ds-swatch-tok">{tok}</span>
      </div>
      <div className="ds-swatch-use">{use}</div>
      <div className="ds-swatch-tok" style={{ marginTop: 2, fontSize: 10 }}>{val}</div>
    </div>
  );
}

// Type scale ─────────────────────────────────────────────────────────────────
const TYPE_SCALE = [
  { name: 'Display', tok: 'display', size: 56, lh: 0.95, font: 'serif', sample: 'Recover, don\u2019t push.', spec: '56 / 0.95 · Instrument Serif' },
  { name: 'Title',   tok: 'title',   size: 32, lh: 1.05, font: 'serif', sample: 'Mon, May 18 — body\u2019s ledger.', spec: '32 / 1.05 · Instrument Serif' },
  { name: 'Heading', tok: 'h2',      size: 22, lh: 1.15, font: 'serif', sample: 'Skip the lift. Walk 25 min at lunch.', spec: '22 / 1.15 · Instrument Serif' },
  { name: 'Body L',  tok: 'body-l',  size: 16, lh: 1.5,  font: 'sans',  sample: 'HRV down 18% vs your 14-day baseline.', spec: '16 / 1.5 · Geist Regular' },
  { name: 'Body',    tok: 'body',    size: 14, lh: 1.5,  font: 'sans',  sample: 'A walk keeps the loop without taxing it.', spec: '14 / 1.5 · Geist Regular' },
  { name: 'Caption', tok: 'caption', size: 12, lh: 1.45, font: 'sans',  sample: 'Synced 2 min ago · Coverage 88%', spec: '12 / 1.45 · Geist Regular' },
  { name: 'Number',  tok: 'number',  size: 30, lh: 0.92, font: 'serif', sample: '6h 12m', spec: '30 / 0.92 · Instrument Serif · tnum' },
  { name: 'Tag',     tok: 'tag',     size: 10, lh: 1,    font: 'mono',  sample: 'TODAY · YELLOW',                    spec: '10 / 1 · JetBrains Mono · 0.10em' },
];

// SwiftUI snippets ───────────────────────────────────────────────────────────
// Note: HTML-escaped inside CodeBlock via dangerouslySetInnerHTML so we
// can highlight tokens with spans without breaking JSX.
const SNIP = {
  tokens: `
<span class="c">// Body+Tokens.swift — single source of truth for the iOS app</span>
<span class="k">import</span> <span class="t">SwiftUI</span>

<span class="k">extension</span> <span class="t">Color</span> {
    <span class="k">static let</span> paper      = <span class="t">Color</span>(<span class="s">"Paper"</span>)        <span class="c">// #f6f1e8</span>
    <span class="k">static let</span> paperDeep  = <span class="t">Color</span>(<span class="s">"PaperDeep"</span>)
    <span class="k">static let</span> surface    = <span class="t">Color</span>(<span class="s">"Surface"</span>)
    <span class="k">static let</span> ink        = <span class="t">Color</span>(<span class="s">"Ink"</span>)
    <span class="k">static let</span> ink2       = <span class="t">Color</span>(<span class="s">"Ink2"</span>)
    <span class="k">static let</span> muted      = <span class="t">Color</span>(<span class="s">"Muted"</span>)
    <span class="k">static let</span> clay       = <span class="t">Color</span>(<span class="s">"Clay"</span>)
    <span class="k">static let</span> modeGreen  = <span class="t">Color</span>(<span class="s">"ModeGreen"</span>)
    <span class="k">static let</span> modeYellow = <span class="t">Color</span>(<span class="s">"ModeYellow"</span>)
    <span class="k">static let</span> modeRed    = <span class="t">Color</span>(<span class="s">"ModeRed"</span>)
}

<span class="k">enum</span> <span class="t">Space</span> {
    <span class="k">static let</span> xs: <span class="t">CGFloat</span> = <span class="n">4</span>
    <span class="k">static let</span> sm: <span class="t">CGFloat</span> = <span class="n">8</span>
    <span class="k">static let</span> md: <span class="t">CGFloat</span> = <span class="n">12</span>
    <span class="k">static let</span> lg: <span class="t">CGFloat</span> = <span class="n">16</span>
    <span class="k">static let</span> xl: <span class="t">CGFloat</span> = <span class="n">24</span>
    <span class="k">static let</span> xxl: <span class="t">CGFloat</span> = <span class="n">32</span>
}

<span class="k">enum</span> <span class="t">Radius</span> {
    <span class="k">static let</span> tile: <span class="t">CGFloat</span>   = <span class="n">12</span>
    <span class="k">static let</span> card: <span class="t">CGFloat</span>   = <span class="n">18</span>
    <span class="k">static let</span> pill: <span class="t">CGFloat</span>   = <span class="n">999</span>
}

<span class="k">extension</span> <span class="t">Font</span> {
    <span class="k">static let</span> display = <span class="t">Font</span>.custom(<span class="s">"InstrumentSerif-Regular"</span>, size: <span class="n">56</span>)
    <span class="k">static let</span> title   = <span class="t">Font</span>.custom(<span class="s">"InstrumentSerif-Regular"</span>, size: <span class="n">32</span>)
    <span class="k">static let</span> heading = <span class="t">Font</span>.custom(<span class="s">"InstrumentSerif-Regular"</span>, size: <span class="n">22</span>)
    <span class="k">static let</span> number  = <span class="t">Font</span>.custom(<span class="s">"InstrumentSerif-Regular"</span>, size: <span class="n">30</span>)
        .monospacedDigit()
    <span class="k">static let</span> body    = <span class="t">Font</span>.custom(<span class="s">"Geist-Regular"</span>, size: <span class="n">14</span>)
    <span class="k">static let</span> caption = <span class="t">Font</span>.custom(<span class="s">"Geist-Regular"</span>, size: <span class="n">12</span>)
    <span class="k">static let</span> tag     = <span class="t">Font</span>.custom(<span class="s">"JetBrainsMono-Regular"</span>, size: <span class="n">10</span>)
}
`,

  modeOrb: `
<span class="c">// BodyModeOrb.swift — the breathing mode shape</span>
<span class="k">struct</span> <span class="t">BodyModeOrb</span>: <span class="t">View</span> {
    <span class="k">let</span> mode: <span class="t">BodyMode</span>       <span class="c">// .green / .yellow / .red</span>
    <span class="k">var</span> size: <span class="t">CGFloat</span> = <span class="n">220</span>

    <span class="p">@State</span> <span class="k">private var</span> phase = <span class="n">0.0</span>

    <span class="k">var</span> body: <span class="k">some</span> <span class="t">View</span> {
        <span class="t">TimelineView</span>(.animation) { ctx <span class="k">in</span>
            <span class="k">let</span> t = ctx.date.timeIntervalSinceReferenceDate
            <span class="t">BodyShape</span>(t: t)
                .fill(mode.gradient)
                .overlay(<span class="t">BodyShape</span>(t: t).stroke(mode.stroke, lineWidth: <span class="n">0.6</span>))
                .frame(width: size, height: size)
                .accessibilityLabel(<span class="s">"Body mode: </span>\\<span class="p">(mode.label)</span><span class="s">"</span>)
        }
    }
}

<span class="c">// Asymmetric, breathing organic blob — morphs between 3 stable paths.</span>
<span class="k">private struct</span> <span class="t">BodyShape</span>: <span class="t">Shape</span> {
    <span class="k">var</span> t: <span class="t">TimeInterval</span>
    <span class="k">func</span> path(<span class="k">in</span> rect: <span class="t">CGRect</span>) -> <span class="t">Path</span> { … }
}
`,

  sourceChip: `
<span class="c">// SourceChip.swift — attribution + confidence (line-quality variant for charts)</span>
<span class="k">struct</span> <span class="t">SourceChip</span>: <span class="t">View</span> {
    <span class="k">let</span> source: <span class="t">String</span>          <span class="c">// "Oura" / "iPhone" / "photo" …</span>
    <span class="k">let</span> confidence: <span class="t">Confidence</span>  <span class="c">// .high .med .low</span>

    <span class="k">var</span> body: <span class="k">some</span> <span class="t">View</span> {
        <span class="t">HStack</span>(spacing: <span class="t">Space</span>.xs) {
            <span class="t">Circle</span>().fill(confidence.dotColor).frame(width: <span class="n">5</span>, height: <span class="n">5</span>)
            <span class="t">Text</span>(source.uppercased())
                .font(.tag).tracking(<span class="n">0.4</span>)
                .foregroundStyle(.muted)
        }
        .padding(.horizontal, <span class="t">Space</span>.sm)
        .padding(.vertical, <span class="n">2</span>)
        .background(<span class="t">Capsule</span>().fill(<span class="t">Color</span>.paperDeep))
        .accessibilityElement(children: .combine)
        .accessibilityLabel(<span class="s">"</span>\\<span class="p">(source)</span><span class="s">, </span>\\<span class="p">(confidence.label)</span><span class="s"> confidence"</span>)
    }
}
`,

  metricTile: `
<span class="c">// MetricTile.swift — square card surfacing one body number</span>
<span class="k">struct</span> <span class="t">MetricTile</span>: <span class="t">View</span> {
    <span class="k">let</span> metric: <span class="t">DailyMetric</span>     <span class="c">// label, value, delta, source, confidence, trend</span>

    <span class="k">var</span> body: <span class="k">some</span> <span class="t">View</span> {
        <span class="t">VStack</span>(alignment: .leading, spacing: <span class="t">Space</span>.sm) {
            <span class="t">HStack</span> {
                <span class="t">Text</span>(metric.label).font(.tag).foregroundStyle(.muted)
                <span class="t">Spacer</span>()
                <span class="t">SourceChip</span>(source: metric.source, confidence: metric.confidence)
            }
            <span class="t">Text</span>(metric.value).font(.number).foregroundStyle(.ink)
            <span class="t">Spacer</span>(minLength: <span class="n">0</span>)
            <span class="t">HStack</span> {
                <span class="t">Text</span>(metric.delta).font(.caption).foregroundStyle(.muted)
                <span class="t">Spacer</span>()
                <span class="t">Sparkline</span>(values: metric.trend, confidence: metric.confidence)
                    .frame(width: <span class="n">56</span>, height: <span class="n">16</span>)
            }
        }
        .padding(<span class="t">Space</span>.md)
        .frame(minHeight: <span class="n">96</span>, alignment: .topLeading)
        .background(<span class="t">RoundedRectangle</span>(cornerRadius: <span class="t">Radius</span>.tile + <span class="n">2</span>)
            .fill(.surface).stroke(.hairline, lineWidth: <span class="n">1</span>))
        .contentShape(<span class="t">Rectangle</span>())
    }
}
`,

  systemCard: `
<span class="c">// SystemCard.swift — quieter, framed message from OpenClaw</span>
<span class="k">struct</span> <span class="t">SystemCard</span>&lt;<span class="t">Content</span>: <span class="t">View</span>&gt;: <span class="t">View</span> {
    <span class="k">let</span> title: <span class="t">String</span>?
    <span class="k">let</span> source: <span class="t">String</span>?
    <span class="k">let</span> confidence: <span class="t">Confidence</span>
    <span class="p">@ViewBuilder var</span> content: () -> <span class="t">Content</span>

    <span class="k">var</span> body: <span class="k">some</span> <span class="t">View</span> {
        <span class="t">VStack</span>(alignment: .leading, spacing: <span class="t">Space</span>.sm) {
            <span class="k">if let</span> title {
                <span class="t">HStack</span>(spacing: <span class="t">Space</span>.sm) {
                    <span class="t">Text</span>(title).font(.tag).foregroundStyle(.ink2)
                    <span class="t">Rectangle</span>().fill(.hairline).frame(height: <span class="n">1</span>)
                    <span class="k">if let</span> source {
                        <span class="t">SourceChip</span>(source: source, confidence: confidence)
                    }
                }
            }
            content()
        }
        .padding(<span class="t">Space</span>.md)
        .background(<span class="t">RoundedRectangle</span>(cornerRadius: <span class="t">Radius</span>.card)
            .fill(.surface2).stroke(.hairline, lineWidth: <span class="n">1</span>))
        .frame(maxWidth: <span class="n">320</span>, alignment: .leading)
    }
}
`,

  button: `
<span class="c">// PrimaryButton.swift — Ink-on-paper, single big CTA</span>
<span class="k">struct</span> <span class="t">PrimaryButton</span>: <span class="t">View</span> {
    <span class="k">let</span> title: <span class="t">String</span>
    <span class="k">let</span> action: () -> <span class="t">Void</span>

    <span class="k">var</span> body: <span class="k">some</span> <span class="t">View</span> {
        <span class="t">Button</span>(action: action) {
            <span class="t">Text</span>(title)
                .font(.body.weight(.medium))
                .foregroundStyle(.paper)
                .frame(maxWidth: .infinity)
                .padding(.vertical, <span class="n">11</span>)
        }
        .background(<span class="t">RoundedRectangle</span>(cornerRadius: <span class="t">Radius</span>.tile).fill(.ink))
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: title)
    }
}

<span class="c">// GhostButton — secondary, hairline outline. Same internals.</span>
`,

  oneThing: `
<span class="c">// TheOneThing.swift — daily action card. There is exactly one.</span>
<span class="k">struct</span> <span class="t">TheOneThing</span>: <span class="t">View</span> {
    <span class="k">let</span> action: <span class="t">DailyAction</span>
    <span class="k">let</span> mode: <span class="t">BodyMode</span>

    <span class="k">var</span> body: <span class="k">some</span> <span class="t">View</span> {
        <span class="t">VStack</span>(alignment: .leading, spacing: <span class="t">Space</span>.md) {
            <span class="t">HStack</span> {
                <span class="t">Text</span>(<span class="s">"The one thing"</span>).font(.tag).foregroundStyle(.ink2)
                <span class="t">Rectangle</span>().fill(.hairline).frame(height: <span class="n">1</span>)
                <span class="t">Text</span>(action.window).font(.caption.monospacedDigit())
                    .foregroundStyle(.muted)
            }
            <span class="t">HStack</span>(alignment: .top, spacing: <span class="t">Space</span>.md) {
                <span class="t">Image</span>(systemName: action.icon)
                    .font(.system(size: <span class="n">22</span>, weight: .regular))
                    .foregroundStyle(mode.tint)
                    .frame(width: <span class="n">46</span>, height: <span class="n">46</span>)
                    .background(<span class="t">RoundedRectangle</span>(cornerRadius: <span class="n">12</span>).fill(mode.tintSoft))
                <span class="t">VStack</span>(alignment: .leading, spacing: <span class="n">6</span>) {
                    <span class="t">Text</span>(action.title).font(.heading)
                    <span class="t">Text</span>(action.why).font(.body).foregroundStyle(.muted)
                }
            }
            <span class="t">HStack</span>(spacing: <span class="t">Space</span>.sm) {
                <span class="t">PrimaryButton</span>(title: <span class="s">"Plan it"</span>) { … }
                <span class="t">GhostButton</span>(title: <span class="s">"Why this?"</span>) { … }
            }
        }
        .padding(<span class="t">Space</span>.lg)
        .background(
            <span class="t">RoundedRectangle</span>(cornerRadius: <span class="t">Radius</span>.card)
                .fill(.surface).stroke(.hairline, lineWidth: <span class="n">1</span>)
        )
        <span class="c">// soft mode-tinted blur in top-right corner</span>
        .overlay(alignment: .topTrailing) {
            <span class="t">Circle</span>().fill(mode.tintSoft).frame(width: <span class="n">120</span>, height: <span class="n">120</span>)
                .blur(radius: <span class="n">20</span>).opacity(<span class="n">0.7</span>)
                .offset(x: <span class="n">30</span>, y: -<span class="n">30</span>).allowsHitTesting(<span class="k">false</span>)
        }
        .clipShape(<span class="t">RoundedRectangle</span>(cornerRadius: <span class="t">Radius</span>.card))
    }
}
`,

  ledger: `
<span class="c">// LedgerRow.swift — one metric, exploded</span>
<span class="k">struct</span> <span class="t">LedgerRow</span>: <span class="t">View</span> {
    <span class="k">let</span> entry: <span class="t">LedgerEntry</span>

    <span class="k">var</span> body: <span class="k">some</span> <span class="t">View</span> {
        <span class="t">HStack</span>(alignment: .top, spacing: <span class="t">Space</span>.md) {
            <span class="t">Image</span>(systemName: entry.icon).foregroundStyle(.ink2)
                .frame(width: <span class="n">32</span>, height: <span class="n">32</span>)
                .background(<span class="t">RoundedRectangle</span>(cornerRadius: <span class="n">8</span>).fill(.paperDeep))
            <span class="t">VStack</span>(alignment: .leading, spacing: <span class="n">6</span>) {
                <span class="t">HStack</span>(alignment: .firstTextBaseline) {
                    <span class="t">Text</span>(entry.label).font(.body)
                    <span class="t">Spacer</span>()
                    <span class="t">Text</span>(entry.value).font(.number)
                    <span class="k">if let</span> u = entry.unit {
                        <span class="t">Text</span>(u).font(.caption.monospacedDigit())
                            .foregroundStyle(.muted)
                    }
                }
                <span class="k">if let</span> sub = entry.sub { <span class="t">Text</span>(sub).font(.caption).foregroundStyle(.muted) }
                <span class="t">SourceChip</span>(source: entry.source, confidence: entry.confidence)
                <span class="k">if let</span> story = entry.story {
                    <span class="t">Text</span>(story).font(.caption)
                        .foregroundStyle(.muted).padding(<span class="t">Space</span>.sm)
                        .background(<span class="t">RoundedRectangle</span>(cornerRadius: <span class="n">8</span>).fill(.paper))
                        .overlay(alignment: .leading) {
                            <span class="t">Rectangle</span>().fill(.hairlineStrong).frame(width: <span class="n">2</span>)
                        }
                }
            }
        }
        .padding(.vertical, <span class="t">Space</span>.md)
        .overlay(alignment: .bottom) {
            <span class="t">Divider</span>().background(.hairline)
        }
    }
}
`,

  voice: `
<span class="c">// OpenClaw.Voice — copy rules surfaced as a static guide</span>
<span class="k">enum</span> <span class="t">Voice</span> {
    <span class="c">// 1. Lead with the action, then the reason.</span>
    <span class="c">//    "Skip the lift. Walk 25 min at lunch."  ✅</span>
    <span class="c">//    "Your HRV is low so consider a walk."     ❌</span>

    <span class="c">// 2. Use plain numbers + units. No emojis. No exclamation marks.</span>
    <span class="c">//    "Slept 6h 12m. HRV down 18%."  ✅</span>

    <span class="c">// 3. Speak in the first person, sparingly.</span>
    <span class="c">//    "I set today to yellow."  ✅</span>
    <span class="c">//    "We've noticed your sleep…"  ❌</span>

    <span class="c">// 4. Never push. Inform, then let the user decide.</span>
    <span class="c">//    "One thing: walk 25 min at lunch."  ✅</span>
    <span class="c">//    "You should walk now."              ❌</span>

    <span class="c">// 5. Confidence words mirror line-quality.</span>
    <span class="c">//    "≈ 410 kcal"  · solid trend = confident, dotted = rough.</span>
}
`,
};

// ───────────────────────────────────────────────────────────────────────────
// Live previews
// ───────────────────────────────────────────────────────────────────────────

function PreviewModeOrbs() {
  return (
    <div className="ds-preview" style={{ background: 'var(--paper-deep)' }}>
      <div className="ds-mode-row" style={{ width: '100%', margin: 0 }}>
        {['green','yellow','red'].map(m => (
          <div key={m} className="ds-mode-cell" style={{ background: 'transparent', border: 'none' }}>
            <ModeOrb mode={m} size={120} />
            <div>
              <div className="label" style={{ textAlign: 'center' }}>{m}</div>
              <div className="name" style={{ textAlign: 'center' }}>{m === 'green' ? 'Push' : m === 'yellow' ? 'Protect' : 'Restore'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewSourceChips() {
  return (
    <div className="ds-preview compact">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <SourceChip src="Oura" conf="high" />
        <SourceChip src="iPhone" conf="high" />
        <SourceChip src="photos" conf="med" />
        <SourceChip src="manual" conf="low" />
        <SourceChip src="Calendar" conf="high" />
      </div>
    </div>
  );
}

function PreviewMetricTiles() {
  const tiles = window.SAMPLE.today.metrics.slice(0, 4);
  return (
    <div className="ds-preview" style={{ alignItems: 'stretch' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: 360, margin: '0 auto' }}>
        {tiles.map(m => <MetricTile key={m.key} m={m} />)}
      </div>
    </div>
  );
}

function PreviewButtons() {
  return (
    <div className="ds-preview compact">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <button style={{ all: 'unset', cursor: 'pointer', padding: '11px 20px', borderRadius: 12, background: 'var(--ink)', color: 'var(--paper)', fontSize: 14, fontWeight: 500 }}>Plan it</button>
        <button style={{ all: 'unset', cursor: 'pointer', padding: '11px 18px', borderRadius: 12, background: 'transparent', border: '1px solid var(--hair-strong)', color: 'var(--ink-2)', fontSize: 14 }}>Why this?</button>
        <button style={{ all: 'unset', cursor: 'pointer', padding: '9px 14px', borderRadius: 999, background: 'var(--paper-deep)', color: 'var(--ink-2)', fontSize: 13 }}>Move to 1 pm</button>
        <button style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: 'var(--clay)', fontWeight: 500 }}>Log now →</button>
      </div>
    </div>
  );
}

function PreviewSystemCard() {
  return (
    <div className="ds-preview" style={{ padding: 24 }}>
      <div style={{
        maxWidth: 320, width: '100%',
        padding: 14, borderRadius: 16,
        background: 'var(--surface-2)', border: '1px solid var(--hair)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <ModeDot mode="yellow" size={9} />
          <span className="hc-cap" style={{ color: 'var(--ink-2)' }}>Yellow — short sleep</span>
          <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
          <span className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>6:55 am</span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.45 }}>
          Slept <strong>6h 12m</strong>. HRV down 18%.
        </div>
        <div style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          One thing: <span style={{ color: 'var(--clay)' }}>skip the lift, walk 25 min at lunch.</span>
        </div>
      </div>
    </div>
  );
}

function PreviewOneThing() {
  const t = window.SAMPLE.today;
  return (
    <div className="ds-preview" style={{ padding: 24 }}>
      <div style={{ width: 360, maxWidth: '100%' }}>
        <div className="hc-card" style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 999, background: 'var(--yellow-soft)', filter: 'blur(20px)', opacity: 0.7 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="hc-cap" style={{ color: 'var(--ink-2)' }}>The one thing</span>
              <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
              <span className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{t.oneAction.window}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--yellow-soft)', color: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="walk" size={24} stroke={1.6} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="hc-serif" style={{ fontSize: 22, lineHeight: 1.15, color: 'var(--ink)' }}>{t.oneAction.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.45 }}>{t.oneAction.why}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewIcons() {
  const icons = ['sun','moon','heart','spark','steps','walk','flame','photo','mic','plus','chev','scale','watch','ring','cal','lab','phone','check','cross','pencil','home','chat','book','dots','send'];
  return (
    <div className="ds-preview" style={{ padding: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 18, width: '100%' }}>
        {icons.map(n => (
          <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>
              <Icon name={n} size={22} stroke={1.4} />
            </div>
            <span className="hc-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 0.04 }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewSparklines() {
  return (
    <div className="ds-preview compact">
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Spark data={[7.1,7.4,7.8,6.6,7.2,5.8,6.2]} w={120} h={32} color="var(--ink)" conf="high" />
          <div className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>solid · high</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Spark data={[110,120,95,140,100,85,92]} w={120} h={32} color="var(--clay)" conf="med" />
          <div className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>dashed · medium</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Spark data={[185.1,184.8,184.6,184.4,184.2,null,null]} w={120} h={32} color="var(--ink-2)" conf="low" />
          <div className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>dotted · low</div>
        </div>
      </div>
    </div>
  );
}

function PreviewLedgerRow() {
  return (
    <div className="ds-preview" style={{ padding: 24, alignItems: 'flex-start' }}>
      <div style={{ width: 360, maxWidth: '100%', background: 'var(--surface)', borderRadius: 12, padding: '4px 18px', border: '1px solid var(--hair)' }}>
        <div style={{ padding: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--paper-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
              <Icon name="heart" size={16} stroke={1.4} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>HRV (overnight)</span>
                <span className="hc-num" style={{ fontSize: 24, color: 'var(--ink)' }}>38<span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4, fontFamily: 'var(--mono)' }}>ms</span></span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>14-day baseline 46 ms</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <SourceChip src="Oura" conf="high" />
                <span className="hc-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>high confidence</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 8, padding: '8px 10px', background: 'var(--paper)', borderRadius: 8, borderLeft: '2px solid var(--hair-strong)' }}>
                Down 18%. Together with the short sleep, this is what flipped today to yellow.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Page composition
// ───────────────────────────────────────────────────────────────────────────

function Section({ id, num, title, blurb, children }) {
  return (
    <section id={id} className="ds-section">
      <div className="num">{num}</div>
      <h2>{title}</h2>
      {blurb && <p className="blurb">{blurb}</p>}
      {children}
    </section>
  );
}

function Sub({ id, title, blurb, children }) {
  return (
    <div id={id} className="ds-sub">
      <h3>{title}</h3>
      {blurb && <p className="blurb">{blurb}</p>}
      {children}
    </div>
  );
}

function Hero() {
  return (
    <header className="ds-hero">
      <div className="kicker">Body OS Design System · v0.1</div>
      <h1>A calm, source-agnostic body, in one quiet system.</h1>
      <p className="lede">
        Foundations, components, and patterns for the OpenClaw Body app — built mobile-first for iOS in SwiftUI,
        with a faithful web port in React.
      </p>
      <dl className="meta">
        <div><dt>Primary</dt><dd>iOS · SwiftUI · iOS 17+</dd></div>
        <div><dt>Secondary</dt><dd>Web · React · Safari first</dd></div>
        <div><dt>Audience</dt><dd>James (n=1). Built for one, designed for many.</dd></div>
        <div><dt>Status</dt><dd>Working draft · May 2026</dd></div>
      </dl>
    </header>
  );
}

function Principles() {
  const items = [
    { n: '01', h: 'Say less, mean more.', p: 'One useful thing per moment. The system\u2019s job is to remove decisions, not generate them.' },
    { n: '02', h: 'Source is part of the truth.', p: 'Every number names where it came from. Confidence is rendered in the line, not buried in a tooltip.' },
    { n: '03', h: 'Trust the trend over the device.', p: 'When the math and the scale disagree, the scale wins. Recalibrate quietly.' },
    { n: '04', h: 'Calm, not clinical.', p: 'Warm paper, editorial type, no alarm reds. The app should feel like a journal you keep, not a chart you check.' },
    { n: '05', h: 'Body, then suggestion.', p: 'Always lead with what your body is doing today. Only then offer the action.' },
  ];
  return (
    <div className="ds-grid-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {items.map(p => (
        <div key={p.n} className="ds-principle">
          <div className="n">{p.n}</div>
          <h4>{p.h}</h4>
          <p>{p.p}</p>
        </div>
      ))}
    </div>
  );
}

function Foundations() {
  return (
    <>
      <Sub id="palette" title="Palette — earth, ink, paper" blurb="Warm neutrals do all the heavy lifting. Color is reserved for body-mode tinting and the single accent (clay).">
        <div className="ds-grid-4">
          {PALETTE.map(p => <ColorSwatch key={p.tok} {...p} />)}
        </div>

        <div className="ds-sub" style={{ marginTop: 36 }}>
          <h3 style={{ fontSize: 20 }}>Mode chromas</h3>
          <p className="blurb">Green, yellow, red tint the orb and the "one thing" card. Used at low saturation — these are moods, not alarms.</p>
          <div className="ds-grid-3">
            {MODE_COLORS.map(m => (
              <div key={m.tok} className="ds-panel tight">
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, height: 56, borderRadius: 10, background: m.css }} />
                  <div style={{ flex: 1, height: 56, borderRadius: 10, background: m.softCss }} />
                </div>
                <div className="ds-swatch-meta" style={{ marginTop: 14 }}>
                  <span className="ds-swatch-name">{m.name}</span>
                  <span className="ds-swatch-tok">{m.tok}</span>
                </div>
                <div className="ds-swatch-use">{m.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <span className="hc-cap" style={{ color: 'var(--clay)' }}>Accent</span>
            <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--clay)' }} />
              <div>
                <div className="ds-swatch-name">Clay</div>
                <div className="ds-swatch-tok">--clay · oklch(0.60 0.11 40)</div>
                <div className="ds-swatch-use">Used sparingly — open-loop dots, weight trend, single emphasised links.</div>
              </div>
            </div>
          </div>
        </div>
      </Sub>

      <Sub id="type" title="Typography — editorial, plain, mono" blurb="Instrument Serif carries numbers and headlines. Geist handles UI. JetBrains Mono tags everything that is data or source.">
        <div className="ds-panel">
          {TYPE_SCALE.map(row => (
            <div key={row.tok} className="ds-type-row">
              <div className="ds-type-label">
                <div className="name">{row.name}</div>
                <div className="tok">font/{row.tok}</div>
              </div>
              <div style={{
                fontFamily: row.font === 'serif' ? 'var(--serif)' : row.font === 'mono' ? 'var(--mono)' : 'var(--sans)',
                fontSize: row.size, lineHeight: row.lh, color: 'var(--ink)',
                textTransform: row.font === 'mono' ? 'uppercase' : 'none',
                letterSpacing: row.font === 'mono' ? '0.10em' : (row.size >= 22 ? '-0.015em' : '-0.005em'),
              }}>{row.sample}</div>
              <div className="ds-type-spec">{row.spec}</div>
            </div>
          ))}
        </div>
      </Sub>

      <Sub id="space" title="Space & radii" blurb="A 4-pt scale. Cards round at 18 (resting), tiles at 12 (active), pills at ∞.">
        <div className="ds-grid-2">
          <div className="ds-panel">
            <div className="hc-cap" style={{ marginBottom: 12 }}>Spacing</div>
            {[['xs',4],['sm',8],['md',12],['lg',16],['xl',24],['xxl',32]].map(([n,v]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--hair)' }}>
                <span className="hc-mono" style={{ fontSize: 11, color: 'var(--muted)', width: 56 }}>{`space.${n}`}</span>
                <span className="hc-mono" style={{ fontSize: 11, color: 'var(--muted)', width: 36 }}>{v}pt</span>
                <div style={{ flex: 1, height: 8, position: 'relative' }}>
                  <div style={{ height: 8, width: v * 3, background: 'var(--ink)', borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="ds-panel">
            <div className="hc-cap" style={{ marginBottom: 12 }}>Radii</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {[['tile',12],['card',18],['hero',26],['pill',999]].map(([n,v]) => (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 72, height: 72, background: 'var(--surface)', border: '1px solid var(--hair-strong)', borderRadius: v }} />
                  <span className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{`r.${n} · ${v === 999 ? '∞' : v + 'pt'}`}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, marginTop: 18 }}>
              Cards live inside cards rarely. When they do, inner radius is <span className="hc-mono">r.card − 4</span> to nest cleanly.
            </div>
          </div>
        </div>
      </Sub>

      <Sub id="motion" title="Motion — slow breathing, no spring" blurb="The mode orb breathes (9s loop). State changes use 200–400ms ease-out. Nothing bounces. Reduce-motion drops the breath to a static pose.">
        <div className="ds-panel">
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            <ModeOrb mode="green" size={120} />
            <table className="ds-spec" style={{ flex: 1, minWidth: 320 }}>
              <thead><tr><th>Token</th><th>Duration</th><th>Use</th></tr></thead>
              <tbody>
                <tr><td>motion.breathe</td><td>9000ms loop</td><td>Body Mode Orb morph (3 paths)</td></tr>
                <tr><td>motion.fade</td><td>200ms ease-out</td><td>Reveal / dismiss</td></tr>
                <tr><td>motion.slide</td><td>320ms ease-out</td><td>Sheets, tab transitions</td></tr>
                <tr><td>motion.calibrate</td><td>800ms cubic-bezier(0.2,0.7,0.2,1)</td><td>Chart recalibration redraw</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Sub>

      <Sub id="tokens-code" title="Tokens, in code" blurb="A single tokens file is the source of truth. SwiftUI extensions and CSS variables shadow each other 1:1.">
        <PlatformTabs swift={SNIP.tokens} web={`
<span class="c">// tokens.css — same values, web</span>
:root {
  --paper:       #f6f1e8;
  --paper-deep:  #ede6d8;
  --surface:     #fbf7f0;
  --ink:         #1e1b16;
  --ink-2:       #3a342c;
  --muted:       #6b6358;
  --faint:       #a39a8c;

  <span class="c">/* Mode chromas */</span>
  --green:       oklch(0.58 0.08 152);
  --yellow:      oklch(0.74 0.10 78);
  --red:         oklch(0.55 0.14 28);
  --clay:        oklch(0.60 0.11 40);

  <span class="c">/* Type */</span>
  --serif: 'Instrument Serif', Georgia, serif;
  --sans:  'Geist', -apple-system, system-ui, sans-serif;
  --mono:  'JetBrains Mono', ui-monospace, monospace;

  <span class="c">/* Radii */</span>
  --r-tile: 12px;
  --r-card: 18px;
  --r-pill: 999px;
}
`} />
      </Sub>
    </>
  );
}

function Iconography() {
  return (
    <>
      <PreviewIcons />
      <div className="ds-caption">
        Hairline, 1.4pt stroke. 24pt grid. In SwiftUI we prefer <code style={{ fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--paper-deep)', padding: '1px 6px', borderRadius: 4 }}>SF Symbols</code> matched
        to these — listed by their SF name in the table below. On web they\u2019re hand-drawn to match metrics.
      </div>
      <table className="ds-spec" style={{ marginTop: 18 }}>
        <thead><tr><th>Token</th><th>SF Symbol</th><th>Used in</th></tr></thead>
        <tbody>
          <tr><td>sun</td><td>sun.max</td><td>Today tab, Green mode</td></tr>
          <tr><td>moon</td><td>moon.stars</td><td>Sleep ledger row</td></tr>
          <tr><td>heart</td><td>heart</td><td>HRV / RHR rows</td></tr>
          <tr><td>walk</td><td>figure.walk</td><td>"The one thing" action</td></tr>
          <tr><td>flame</td><td>flame</td><td>Active calories</td></tr>
          <tr><td>scale</td><td>scalemass</td><td>Weight ledger</td></tr>
          <tr><td>ring</td><td>circle.dashed</td><td>Oura source</td></tr>
          <tr><td>photo</td><td>photo</td><td>Meal photo capture</td></tr>
          <tr><td>spark</td><td>leaf</td><td>Protein / quality</td></tr>
        </tbody>
      </table>
    </>
  );
}

function ComponentBlock({ id, title, blurb, preview, swift, web, props, related }) {
  return (
    <Sub id={id} title={title} blurb={blurb}>
      {preview}
      <div className="ds-grid-2" style={{ marginTop: 18, gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <div className="hc-cap" style={{ marginBottom: 10 }}>Implementation</div>
          <PlatformTabs swift={swift} web={web} />
        </div>
        <div>
          <div className="hc-cap" style={{ marginBottom: 10 }}>Props · variants</div>
          <table className="ds-spec">
            <thead><tr><th>Name</th><th>Type</th><th>Notes</th></tr></thead>
            <tbody>{props.map(p => <tr key={p[0]}><td>{p[0]}</td><td>{p[1]}</td><td>{p[2]}</td></tr>)}</tbody>
          </table>
          {related && <div style={{ marginTop: 16, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>{related}</div>}
        </div>
      </div>
    </Sub>
  );
}

function Components() {
  return (
    <>
      <ComponentBlock
        id="cmp-mode-orb"
        title="Body Mode Orb"
        blurb="The hero of the app. An asymmetric, breathing shape encodes how the body is today: green push, yellow protect, red restore."
        preview={<PreviewModeOrbs />}
        swift={SNIP.modeOrb}
        web={`
<span class="c">// React — atoms.jsx</span>
<span class="p">&lt;ModeOrb</span> <span class="p">mode</span>=<span class="s">"yellow"</span> <span class="p">size</span>=<span class="n">{220}</span> <span class="p">breathe /&gt;</span>

<span class="c">// Three stable SVG paths are morphed via SMIL animate.</span>
<span class="c">// Reduce-motion users see the first path, no breathing.</span>
`}
        props={[
          ['mode', '.green / .yellow / .red', 'Single source of state'],
          ['size', 'CGFloat (default 220)', '120 inline · 220 hero · 68 rail'],
          ['breathe', 'Bool (default true)', 'Disabled under reduce-motion'],
          ['gradient', 'derived', 'Inner highlight + edge stroke'],
        ]}
        related="Always paired with the mode dot (8pt circle) for inline references — same hue, simpler shape."
      />

      <ComponentBlock
        id="cmp-source-chip"
        title="Source Chip"
        blurb="A 5-pt dot + 4-letter source tag. The dot's color carries confidence (high · medium · low). Always sits in the corner of the metric it belongs to."
        preview={<PreviewSourceChips />}
        swift={SNIP.sourceChip}
        web={`
<span class="p">&lt;SourceChip</span> <span class="p">src</span>=<span class="s">"Oura"</span> <span class="p">conf</span>=<span class="s">"high"</span> <span class="p">/&gt;</span>

<span class="c">// Confidence dot colors: high=green, med=yellow, low=red.</span>
<span class="c">// Background always paper-deep so chips read on any surface.</span>
`}
        props={[
          ['source', 'String', 'Short label — Oura, iPhone, photos, manual, Calendar'],
          ['confidence', '.high / .med / .low', 'Maps to dot hue + line dash style'],
          ['size', '.standard / .micro', 'Micro for inline (e.g. timeline rows)'],
        ]}
        related="Pair with the matching sparkline dash style — see Confidence below."
      />

      <ComponentBlock
        id="cmp-sparkline"
        title="Sparkline (confidence-aware)"
        blurb="Trend visualization where the line itself carries confidence. Solid = high, dashed = medium, dotted = low. No axes, no labels — these are felt, not read."
        preview={<PreviewSparklines />}
        swift={`
<span class="c">// Sparkline.swift — confidence as line quality</span>
<span class="k">struct</span> <span class="t">Sparkline</span>: <span class="t">View</span> {
    <span class="k">let</span> values: [<span class="t">Double</span>?]
    <span class="k">var</span> color: <span class="t">Color</span> = .ink2
    <span class="k">var</span> confidence: <span class="t">Confidence</span> = .high

    <span class="k">var</span> body: <span class="k">some</span> <span class="t">View</span> {
        <span class="t">Canvas</span> { ctx, size <span class="k">in</span>
            <span class="k">let</span> path = smoothPath(values, in: size)
            <span class="k">var</span> style = <span class="t">StrokeStyle</span>(lineWidth: <span class="n">1.2</span>, lineCap: .round)
            <span class="k">switch</span> confidence {
            <span class="k">case</span> .high: <span class="k">break</span>
            <span class="k">case</span> .med:  style.dash = [<span class="n">3</span>, <span class="n">2</span>]
            <span class="k">case</span> .low:  style.dash = [<span class="n">1</span>, <span class="n">2</span>]
            }
            ctx.stroke(path, with: .color(color), style: style)
            <span class="c">// End-of-line dot for current value</span>
        }
        .accessibilityLabel(<span class="s">"7-day trend"</span>)
    }
}
`}
        web={`
<span class="p">&lt;Spark</span> <span class="p">data</span>=<span class="n">{values}</span> <span class="p">color</span>=<span class="s">"var(--ink-2)"</span> <span class="p">conf</span>=<span class="s">"med"</span> <span class="p">/&gt;</span>

<span class="c">// Implements null-aware smoothing — breaks the path on missing days</span>
<span class="c">// so a missed weigh-in shows as a real gap, not a fake interpolation.</span>
`}
        props={[
          ['values', '[Double?]', 'Nulls render as gaps, not zeroes'],
          ['color', 'Color', 'Inherits text color by default'],
          ['confidence', '.high / .med / .low', 'Solid / dashed / dotted stroke'],
          ['endDot', 'Bool (default true)', 'Punctuates the latest value'],
        ]}
      />

      <ComponentBlock
        id="cmp-metric-tile"
        title="Metric Tile"
        blurb="The atomic unit of the Today grid. Label + source chip on top, hero number, then delta + mini-trend. Tap to drill into the Ledger row."
        preview={<PreviewMetricTiles />}
        swift={SNIP.metricTile}
        web={`
<span class="p">&lt;MetricTile</span> <span class="p">m</span>=<span class="n">{metric}</span> <span class="p">onClick</span>=<span class="n">{() =&gt; nav('ledger')}</span> <span class="p">/&gt;</span>
`}
        props={[
          ['metric.label', 'String', 'Caption-cased — "Sleep", "HRV"'],
          ['metric.value', 'String', 'Editorial number, pre-formatted with unit'],
          ['metric.delta', 'String', 'Plain text — "−18%", "+6", "so far"'],
          ['metric.source', 'String', 'Surfaced via SourceChip'],
          ['metric.confidence', '.high/.med/.low', 'Drives chip dot + sparkline style'],
          ['metric.trend', '[Double?]', 'Last 7–14 days for sparkline'],
        ]}
      />

      <ComponentBlock
        id="cmp-system-card"
        title="System Card (OpenClaw reply)"
        blurb="A quieter, framed message — the conversational unit when the AI says something with structure (estimate, weight, briefing). Distinct from chat bubbles."
        preview={<PreviewSystemCard />}
        swift={SNIP.systemCard}
        web={`
<span class="p">&lt;SystemCard</span> <span class="p">title</span>=<span class="s">"Meal estimate"</span> <span class="p">source</span>=<span class="s">"photo"</span> <span class="p">conf</span>=<span class="s">"med"</span><span class="p">&gt;</span>
  <span class="p">&lt;ProteinKcalRow</span> <span class="p">/&gt;</span>
  <span class="p">&lt;Text&gt;</span>Looks like your usual oats…<span class="p">&lt;/Text&gt;</span>
<span class="p">&lt;/SystemCard&gt;</span>
`}
        props={[
          ['title', 'String?', 'Optional caption row with hairline + source chip'],
          ['source', 'String?', 'Where the assertion came from'],
          ['confidence', '.high/.med/.low', 'Visible in the title row'],
          ['actions', '[Action]', 'Up to 2: a Save and an Edit'],
        ]}
      />

      <ComponentBlock
        id="cmp-button"
        title="Buttons"
        blurb="Three roles only. Primary = ink on paper, used once per screen. Ghost = hairline outline, optional. Pill = transient suggested reply. Plus a clay text-link when the action belongs to an open loop."
        preview={<PreviewButtons />}
        swift={SNIP.button}
        web={`
<span class="c">// Inline styles, see ScrTodayInner for the four roles.</span>
<span class="p">&lt;button</span> <span class="p">className</span>=<span class="s">"hc-btn-primary"</span><span class="p">&gt;</span>Plan it<span class="p">&lt;/button&gt;</span>
`}
        props={[
          ['style', '.primary/.ghost/.pill/.link', 'One primary per screen, max'],
          ['size', '.standard (44pt) / .compact (36pt)', 'Hit target ≥ 44pt on iOS'],
          ['haptic', '.selection / .impact', 'Primary buttons fire selection feedback'],
        ]}
        related="Avoid icon-only buttons except in the chat composer (photo, mic, send) and the kebab menu."
      />

      <ComponentBlock
        id="cmp-tab-bar"
        title="Tab Bar"
        blurb="Five tabs. Hairline icons + 9.5pt mono label, ALL CAPS. Active is ink, inactive is faint. No badges, no dots — alerts live in the Today timeline."
        preview={
          <div className="ds-preview compact" style={{ minHeight: 100 }}>
            <div style={{ width: 360, background: 'var(--paper)', padding: '10px 12px', borderRadius: 16 }}>
              <TabBar active="today" onChange={() => {}} />
            </div>
          </div>
        }
        swift={`
<span class="c">// AppTabView.swift — iOS uses TabView; matches our visual style.</span>
<span class="t">TabView</span>(selection: $selected) {
    <span class="t">TodayScreen</span>().tabItem {
        <span class="t">Label</span>(<span class="s">"Today"</span>, systemImage: <span class="s">"sun.max"</span>)
    }.tag(<span class="t">Tab</span>.today)
    <span class="t">ChatScreen</span>().tabItem {
        <span class="t">Label</span>(<span class="s">"Copilot"</span>, systemImage: <span class="s">"bubble.left"</span>)
    }.tag(<span class="t">Tab</span>.chat)
    <span class="c">// Ledger, Weekly, Sources …</span>
}
.tint(.ink)
.toolbarBackground(.paper, <span class="k">for</span>: .tabBar)
`}
        web={`
<span class="p">&lt;TabBar</span> <span class="p">active</span>=<span class="n">{tab}</span> <span class="p">onChange</span>=<span class="n">{setTab}</span> <span class="p">/&gt;</span>
`}
        props={[
          ['active', 'Tab', 'today · chat · ledger · week · src'],
          ['onChange', '(Tab) => void', 'Drives the route'],
        ]}
      />

      <ComponentBlock
        id="cmp-input-bar"
        title="Chat Input Bar"
        blurb="The Copilot composer. + (attach) on the left, photo + mic on the right. The send button only appears when the user is typing — otherwise it's a mic."
        preview={
          <div className="ds-preview compact" style={{ background: 'var(--paper-deep)' }}>
            <div style={{ width: 360 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--hair-strong)', borderRadius: 999, padding: '6px 6px 6px 14px' }}>
                <Icon name="plus" size={20} color="var(--muted)" />
                <input placeholder="Tell OpenClaw…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }} />
                <Icon name="photo" size={20} color="var(--muted)" />
                <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="mic" size={16} stroke={1.6} />
                </div>
              </div>
            </div>
          </div>
        }
        swift={`
<span class="k">struct</span> <span class="t">ChatComposer</span>: <span class="t">View</span> {
    <span class="p">@Binding var</span> text: <span class="t">String</span>
    <span class="k">let</span> onSend: () -> <span class="t">Void</span>
    <span class="k">let</span> onPhoto: () -> <span class="t">Void</span>
    <span class="k">let</span> onMic: () -> <span class="t">Void</span>

    <span class="k">var</span> body: <span class="k">some</span> <span class="t">View</span> {
        <span class="t">HStack</span>(spacing: <span class="n">6</span>) {
            <span class="t">Button</span>(action: {}) {
                <span class="t">Image</span>(systemName: <span class="s">"plus"</span>)
            }
            <span class="t">TextField</span>(<span class="s">"Tell OpenClaw…"</span>, text: $text, axis: .vertical)
                .lineLimit(<span class="n">1</span>...<span class="n">4</span>)
            <span class="t">Button</span>(action: onPhoto) { <span class="t">Image</span>(systemName: <span class="s">"photo"</span>) }
            <span class="t">Button</span>(action: text.isEmpty ? onMic : onSend) {
                <span class="t">Image</span>(systemName: text.isEmpty ? <span class="s">"mic"</span> : <span class="s">"paperplane.fill"</span>)
                    .foregroundStyle(.paper).padding(<span class="n">10</span>)
                    .background(<span class="t">Circle</span>().fill(.ink))
            }
        }
        .padding(<span class="n">6</span>)
        .background(<span class="t">Capsule</span>().fill(.surface).stroke(.hairlineStrong))
    }
}
`}
        web={`<span class="c">// See ScrChatInner — same composition.</span>`}
        props={[
          ['placeholder', 'String', '"Tell OpenClaw…"'],
          ['onPhoto', '() => void', 'Opens system camera + photo picker'],
          ['onMic', '() => void', 'Voice → text → meal estimate flow'],
          ['suggestedReplies', '[String]', 'Pill row above the composer'],
        ]}
      />

      <ComponentBlock
        id="cmp-ledger-row"
        title="Ledger Row"
        blurb="One metric, exploded. Icon + label + editorial number + unit, then a sub-line, then source/confidence, then optional 'story' — the prose explaining how the number got there."
        preview={<PreviewLedgerRow />}
        swift={SNIP.ledger}
        web={`<span class="c">// See screen-ledger.jsx — LedgerRow component.</span>`}
        props={[
          ['icon', 'SF Symbol', 'Hairline 16pt'],
          ['label', 'String', '"Sleep" / "HRV"'],
          ['value', 'String', '"6h 12m" / "38"'],
          ['unit', 'String?', 'Tabular monospace suffix'],
          ['source', 'String', 'Surfaced via SourceChip'],
          ['confidence', '.high/.med/.low', 'Drives both chip + chart'],
          ['sub', 'String?', 'Baseline / context line'],
          ['story', 'String?', 'Why this number matters today'],
        ]}
      />
    </>
  );
}

function Patterns() {
  return (
    <>
      <ComponentBlock
        id="ptn-one-thing"
        title="The One Thing"
        blurb="The single most important pattern in the app. One action per day, framed by its window of time and the body reason behind it. Mode-tinted blur in the corner — the only place we let color bloom."
        preview={<PreviewOneThing />}
        swift={SNIP.oneThing}
        web={`<span class="c">// See screen-today.jsx — the &lt;OneAction&gt; card.</span>`}
        props={[
          ['action.title', 'String', 'Imperative, ≤ 8 words.'],
          ['action.why', 'String', '1 sentence linking the action to a body signal.'],
          ['action.window', 'String', 'Time window — e.g. "12:30 – 1:15 pm"'],
          ['mode', 'BodyMode', 'Drives icon tint & background bloom'],
        ]}
        related={<>Never display two One-Thing cards on one screen. If a second action is warranted, queue it for tomorrow.</>}
      />

      <Sub id="ptn-calibration" title="Calibration chart" blurb="The single hardest idea in the product, made simple: estimated deficit (bars, both directions) overlaid with observed weight trend (one black line). When they disagree, OpenClaw narrates the correction.">
        <div className="ds-preview tall">
          <div style={{ width: 480 }}>
            <div className="hc-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="hc-cap" style={{ color: 'var(--ink-2)' }}>Deficit vs. weight trend</span>
                <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span className="hc-num" style={{ fontSize: 36 }}>−0.9</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>lb this week</span>
              </div>
              <CalibrationChart days={window.SAMPLE.weekly.days} weightTrend={window.SAMPLE.weekly.weightTrend} deficitEst={window.SAMPLE.weekly.deficitEst} />
            </div>
          </div>
        </div>
        <div className="ds-caption">
          Pattern rule: the line and the bars share the same vertical center. When the bar height ≠ the line slope, the system has license to recalibrate and explain. This is the only chart in the app with two scales.
        </div>
      </Sub>

      <Sub id="ptn-open-loop" title="Open Loop" blurb="An unobtrusive row, clay dot on the left, action link on the right. Used when the system needs the user to close a small gap — a missed weigh-in, an unphotographed meal.">
        <div className="ds-preview compact">
          <div style={{
            width: 360, display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 12,
            background: 'var(--surface)', border: '1px solid var(--hair)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--clay)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: 'var(--ink)' }}>Weight not logged</div>
              <div className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>since Saturday</div>
            </div>
            <span style={{ fontSize: 13, color: 'var(--clay)', fontWeight: 500 }}>Log now →</span>
          </div>
        </div>
        <div className="ds-caption">
          Open loops never blink, badge, or interrupt. They wait, quietly, in a single list on Today.
        </div>
      </Sub>

      <Sub id="ptn-coverage" title="Coverage indicator" blurb="A small circular meter that shows what fraction of today's expected signals arrived. Sits on the Ledger header and on the Sources hero.">
        <div className="ds-preview compact">
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {[58, 76, 92, 100].map(pct => (
              <div key={pct} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ position: 'relative', width: 56, height: 56 }}>
                  <svg viewBox="0 0 56 56" width={56} height={56}>
                    <circle cx="28" cy="28" r="22" fill="none" stroke="var(--hair-strong)" strokeWidth="4" />
                    <circle cx="28" cy="28" r="22" fill="none" stroke={pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : 'var(--clay)'}
                      strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 2 * Math.PI * 22} ${2 * Math.PI * 22}`}
                      transform="rotate(-90 28 28)" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="hc-serif" style={{ fontSize: 17 }}>{pct}</span>
                  </div>
                </div>
                <span className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </Sub>
    </>
  );
}

function VoiceTone() {
  return (
    <>
      <div className="ds-panel">
        <CodeBlock>{SNIP.voice}</CodeBlock>
      </div>
      <div className="ds-grid-2" style={{ marginTop: 24 }}>
        <div className="ds-panel">
          <div className="hc-cap" style={{ color: 'var(--green)', marginBottom: 10 }}>Do</div>
          <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            <li>"Skip the lift. Walk 25 min at lunch."</li>
            <li>"Slept 6h 12m. HRV down 18%. I set today to yellow."</li>
            <li>"Step on. I'll read the scale."</li>
            <li>"≈ 410 kcal · 12g protein"</li>
            <li>"Walk window in 12 min."</li>
          </ul>
        </div>
        <div className="ds-panel">
          <div className="hc-cap" style={{ color: 'var(--clay)', marginBottom: 10 }}>Don\u2019t</div>
          <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            <li>"Great job hitting 8k steps! 🎉"</li>
            <li>"We\u2019ve noticed your sleep is suboptimal."</li>
            <li>"You should drink more water!"</li>
            <li>"Your daily streak: 14 days 🔥"</li>
            <li>"Want me to plan your perfect day?"</li>
          </ul>
        </div>
      </div>
    </>
  );
}

function Platform() {
  return (
    <>
      <div className="ds-grid-2">
        <div className="ds-panel">
          <div className="hc-cap" style={{ marginBottom: 10, color: 'var(--ink)' }}>iOS · SwiftUI (primary)</div>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
            iOS 17+. SwiftUI for all surfaces. Tokens live in <span className="hc-mono">Body+Tokens.swift</span>. HealthKit is the ingestion bridge — the OS authorization model is treated as a first-class onboarding step.
          </p>
          <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            <li>HIG: respect <span className="hc-mono">.large</span> nav titles, dynamic type, and reduce-motion.</li>
            <li>SF Symbols used by name; bespoke icons only when no symbol fits.</li>
            <li>Bottom sheets via <span className="hc-mono">.sheet(.presentationDetents)</span>.</li>
            <li>Haptics: <span className="hc-mono">.selection</span> on primary actions, <span className="hc-mono">.impact(.soft)</span> on mode flips.</li>
            <li>Widgets &amp; Live Activities for the Today briefing.</li>
          </ul>
        </div>
        <div className="ds-panel">
          <div className="hc-cap" style={{ marginBottom: 10, color: 'var(--ink)' }}>Web · React (secondary)</div>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
            A faithful port for the desktop "Operator" view and a read-only mobile fallback. Components mirror SwiftUI APIs 1:1. No icon font — inline SVGs match the SF set.
          </p>
          <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            <li>CSS variables defined in <span className="hc-mono">tokens.css</span>; same names as Swift extensions.</li>
            <li>System font stack mirrors Geist (with -apple-system fallback).</li>
            <li>Charts hand-drawn in SVG — no chart library.</li>
            <li>Same five tabs; bottom on mobile, top-left on desktop.</li>
            <li>Reduce-motion media query disables breathing animation.</li>
          </ul>
        </div>
      </div>

      <div className="ds-sub" style={{ marginTop: 36 }}>
        <h3 style={{ fontSize: 20 }}>Accessibility minimums</h3>
        <table className="ds-spec" style={{ marginTop: 8 }}>
          <thead><tr><th>Rule</th><th>Target</th><th>How we honor it</th></tr></thead>
          <tbody>
            <tr><td>Hit target</td><td>≥ 44 × 44 pt</td><td>All tappable rows in lists, all chips with actions</td></tr>
            <tr><td>Text contrast</td><td>≥ 4.5:1 body</td><td>Ink #1e1b16 on paper #f6f1e8 ≈ 13:1</td></tr>
            <tr><td>Dynamic type</td><td>Body scales 100–200%</td><td>All <span className="hc-mono">Font</span> tokens are sized in pt; serif sizes lock at headlines.</td></tr>
            <tr><td>Reduce motion</td><td>Honored</td><td>Body Mode Orb freezes; chart redraws cross-fade instead of morph</td></tr>
            <tr><td>VoiceOver</td><td>Every metric has a sentence label</td><td>"Sleep, 6 hours 12 minutes. High confidence from Oura. Down 1 hour from baseline."</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function Nav() {
  const items = [
    { sec: 'Start', links: [
      ['Overview', 'overview'],
      ['Principles', 'principles'],
    ]},
    { sec: 'Foundations', links: [
      ['Palette', 'palette'],
      ['Typography', 'type'],
      ['Space & radii', 'space'],
      ['Motion', 'motion'],
      ['Tokens, in code', 'tokens-code'],
      ['Iconography', 'iconography'],
    ]},
    { sec: 'Components', links: [
      ['Body Mode Orb', 'cmp-mode-orb'],
      ['Source Chip', 'cmp-source-chip'],
      ['Sparkline', 'cmp-sparkline'],
      ['Metric Tile', 'cmp-metric-tile'],
      ['System Card', 'cmp-system-card'],
      ['Buttons', 'cmp-button'],
      ['Tab Bar', 'cmp-tab-bar'],
      ['Chat Input Bar', 'cmp-input-bar'],
      ['Ledger Row', 'cmp-ledger-row'],
    ]},
    { sec: 'Patterns', links: [
      ['The One Thing', 'ptn-one-thing'],
      ['Calibration chart', 'ptn-calibration'],
      ['Open Loop', 'ptn-open-loop'],
      ['Coverage', 'ptn-coverage'],
    ]},
    { sec: 'Practice', links: [
      ['Voice & tone', 'voice'],
      ['Platform', 'platform'],
    ]},
  ];
  return (
    <aside className="ds-nav">
      <div className="ds-nav-brand">
        <div className="mark">O</div>
        <div>
          <div className="name">Body OS</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Design system</div>
        </div>
        <div style={{ marginLeft: 'auto' }} />
        <div className="ver">v0.1</div>
      </div>
      {items.map(group => (
        <div key={group.sec}>
          <div className="ds-nav-section">{group.sec}</div>
          {group.links.map(([label, id]) => (
            <a key={id} href={`#${id}`}>{label}</a>
          ))}
        </div>
      ))}
      <div className="ds-nav-section" style={{ marginTop: 28 }}>Project</div>
      <a href="Health Copilot.html">← Prototype canvas</a>
    </aside>
  );
}

function App() {
  return (
    <div className="ds-shell">
      <Nav />
      <main className="ds-main">
        <div id="overview" />
        <Hero />
        <Section id="principles" num="01 / Principles" title="Five rules that shape every decision.">
          <Principles />
        </Section>
        <Section id="foundations" num="02 / Foundations" title="Color, type, space, motion." blurb="The small set of choices everything else inherits from. Defined once, in two languages.">
          <Foundations />
        </Section>
        <Section id="iconography" num="03 / Iconography" title="Hairline, calm, named." blurb="On iOS we use SF Symbols for everything we can. On web they\u2019re hand-drawn to match.">
          <Iconography />
        </Section>
        <Section id="components" num="04 / Components" title="Reusable parts." blurb="Each one is a single concept — one job. Composed from the foundations, never from each other.">
          <Components />
        </Section>
        <Section id="patterns" num="05 / Patterns" title="Compositions with intent." blurb="A pattern is a recipe — what a screen does, not just how it looks.">
          <Patterns />
        </Section>
        <Section id="voice" num="06 / Voice & tone" title="What OpenClaw sounds like." blurb="Quiet, plain, never cheerful. Speak only when there is something to say.">
          <VoiceTone />
        </Section>
        <Section id="platform" num="07 / Platform" title="iOS first, web second." blurb="Two implementations of the same system. The Swift code is the source of truth; the web mirrors it.">
          <Platform />
        </Section>

        <footer style={{ marginTop: 80, paddingTop: 28, borderTop: '1px solid var(--hair)', color: 'var(--muted)', fontSize: 12.5 }}>
          Body OS Design System · v0.1 · Working draft, May 2026
        </footer>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('ds-root')).render(<App />);
