// Copilot — quiet chat. Sparse system messages, photo meal logging, weight,
// suggested replies. Voice/text/photo input bar.

function ChatBubble({ msg }) {
  const me = msg.role === 'me';
  return (
    <div style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
      <div style={{
        maxWidth: '78%',
        padding: msg.kind === 'photo' ? 6 : '10px 14px',
        borderRadius: me ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: me ? 'var(--ink)' : 'var(--surface)',
        color: me ? 'var(--paper)' : 'var(--ink)',
        border: me ? 'none' : '1px solid var(--hair)',
        fontSize: 14, lineHeight: 1.45,
      }}>
        {msg.kind === 'photo' ? (
          <div style={{ width: 180, height: 180, borderRadius: 14, overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, oklch(0.85 0.04 70), oklch(0.78 0.06 50))' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)' }}>
              <Icon name="photo" size={32} stroke={1.2} color="rgba(255,255,255,0.8)" />
            </div>
            <div style={{ position: 'absolute', bottom: 6, left: 8, color: 'rgba(255,255,255,0.95)', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: 0.04 }}>{msg.caption}</div>
          </div>
        ) : msg.body}
      </div>
    </div>
  );
}

function SysCard({ children, kind = 'plain' }) {
  // System "card" — a quieter, framed message for richer system replies.
  return (
    <div style={{
      maxWidth: '88%',
      padding: 14,
      borderRadius: 16,
      background: 'var(--surface-2)',
      border: '1px solid var(--hair)',
      marginBottom: 6,
      fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)',
    }}>{children}</div>
  );
}

function MealEstimateCard() {
  // The interesting message — when the AI gets a meal photo and estimates.
  return (
    <SysCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span className="hc-cap" style={{ color: 'var(--ink-2)' }}>Meal estimate</span>
        <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
        <SourceChip src="photo" conf="med" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', rowGap: 6, columnGap: 12, alignItems: 'baseline' }}>
        <span className="hc-mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>kcal</span>
        <span className="hc-conf-med" style={{ height: 1 }} />
        <span className="hc-serif" style={{ fontSize: 16 }}>410</span>
        <span className="hc-mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>protein</span>
        <span className="hc-conf-med" style={{ height: 1 }} />
        <span className="hc-serif" style={{ fontSize: 16 }}>12 g</span>
        <span className="hc-mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>carbs</span>
        <span className="hc-conf-low" style={{ height: 1 }} />
        <span className="hc-serif" style={{ fontSize: 16 }}>62 g</span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10, lineHeight: 1.45 }}>
        Looks like your usual oats + blueberries + black coffee. Save as <em>"regular breakfast"</em>?
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button style={{ all: 'unset', cursor: 'pointer', padding: '7px 12px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', fontSize: 12, fontWeight: 500 }}>Save & log</button>
        <button style={{ all: 'unset', cursor: 'pointer', padding: '7px 12px', borderRadius: 999, background: 'transparent', border: '1px solid var(--hair-strong)', fontSize: 12, color: 'var(--ink-2)' }}>Edit</button>
      </div>
    </SysCard>
  );
}

function WeightCard() {
  return (
    <SysCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span className="hc-cap" style={{ color: 'var(--ink-2)' }}>Weight, 7-day trend</span>
        <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
        <SourceChip src="manual" conf="high" />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
        <div className="hc-serif" style={{ fontSize: 32, lineHeight: 1 }}>184.0<span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 4 }}>lb</span></div>
        <div style={{ flex: 1 }}>
          <Spark data={[185.6,185.2,184.9,184.8,184.6,184.4,184.0]} w={120} h={28} color="var(--clay)" />
          <div className="hc-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>−0.9 lb this week</div>
        </div>
      </div>
    </SysCard>
  );
}

function ScrChatInner({ onTab }) {
  const [input, setInput] = React.useState('');
  const [showSuggest, setShowSuggest] = React.useState(true);

  return (
    <div className="hc-root" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      {/* Header */}
      <div style={{ padding: '54px 20px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--hair)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 999, background: 'linear-gradient(135deg, var(--clay), oklch(0.50 0.10 30))', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 3, borderRadius: 999, background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="hc-serif" style={{ fontSize: 18, color: 'var(--clay)' }}>O</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>OpenClaw</div>
          <div className="hc-mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>quiet · always on</div>
        </div>
        <button style={{ all: 'unset', cursor: 'pointer', padding: 8, color: 'var(--muted)' }}>
          <Icon name="dots" size={20} />
        </button>
      </div>

      {/* Conversation */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 8px' }}>
        {/* Time divider */}
        <div style={{ textAlign: 'center', margin: '4px 0 14px' }}>
          <span className="hc-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: 0.06, textTransform: 'uppercase' }}>This morning</span>
        </div>

        {/* Sparse system briefing */}
        <SysCard>
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
        </SysCard>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <ChatBubble msg={{ role: 'me', body: 'ok. weigh-in?' }} />
        </div>
        <div style={{ display: 'flex' }}>
          <ChatBubble msg={{ role: 'sys', body: 'Step on. I\u2019ll read the scale.' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ChatBubble msg={{ role: 'me', body: '184.0' }} />
        </div>
        <WeightCard />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <ChatBubble msg={{ role: 'me', kind: 'photo', caption: 'breakfast' }} />
        </div>
        <MealEstimateCard />

        {/* Latest */}
        <div style={{ textAlign: 'center', margin: '14px 0' }}>
          <span className="hc-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: 0.06, textTransform: 'uppercase' }}>12:18 pm</span>
        </div>
        <SysCard>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Walk window in 12 min. <span className="hc-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>68°F, clear</span>
          </div>
        </SysCard>

        {/* Suggested replies */}
        {showSuggest && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, padding: '0 4px' }}>
            {['I\u2019ll head out at 12:30', 'Move to 1pm', 'What about tomorrow\u2019s lift?'].map((s, i) => (
              <button key={i} style={{
                all: 'unset', cursor: 'pointer',
                padding: '8px 12px', borderRadius: 999,
                background: 'transparent', border: '1px solid var(--hair-strong)',
                fontSize: 12.5, color: 'var(--ink-2)',
              }}>{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: '8px 12px 88px', background: 'var(--paper)', borderTop: '1px solid var(--hair)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--surface)', border: '1px solid var(--hair-strong)',
          borderRadius: 999, padding: '6px 6px 6px 14px',
        }}>
          <button style={{ all: 'unset', cursor: 'pointer', color: 'var(--muted)', padding: 6 }}>
            <Icon name="plus" size={20} stroke={1.5} />
          </button>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tell OpenClaw…" style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: '6px 0',
          }} />
          <button style={{ all: 'unset', cursor: 'pointer', color: 'var(--muted)', padding: 6 }}>
            <Icon name="photo" size={20} stroke={1.5} />
          </button>
          <button style={{
            all: 'unset', cursor: 'pointer',
            width: 36, height: 36, borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {input ? <Icon name="send" size={16} stroke={1.6} /> : <Icon name="mic" size={16} stroke={1.6} />}
          </button>
        </div>
      </div>
    </div>
  );
}

window.ScrChatInner = ScrChatInner;
