// Sample data — James, a burned-out knowledge worker, Sun May 18, 2026.
// Yellow body mode: short sleep, elevated HR, low recovery.

const SAMPLE = {
  user: { name: 'James', tz: 'America/Los_Angeles' },
  today: {
    dateLabel: 'Monday, May 18',
    mode: 'yellow',              // 'green' | 'yellow' | 'red'
    modeReason: 'Short sleep on a heavy meeting day. Protect recovery.',
    headline: 'Recover, don\u2019t push.',
    oneAction: {
      title: 'Skip the lift. Walk 25 min at lunch.',
      why: 'HRV down 18% vs your 14-day baseline. A walk keeps the loop without taxing it.',
      window: '12:30 \u2013 1:15 pm',
      icon: 'walk',
    },
    openLoops: [
      { id: 'weight',  label: 'Weight not logged',     since: 'since Saturday', cta: 'Log now' },
      { id: 'dinner',  label: 'Dinner photo missing',  since: 'last night',     cta: 'Add photo' },
    ],
    metrics: [
      { key: 'sleep',   label: 'Sleep',      value: '6h 12m', delta: '\u22121h 04m', conf: 'high', src: 'Oura',  trend: [7.1,7.4,7.8,6.6,7.2,5.8,6.2] },
      { key: 'hrv',     label: 'HRV',        value: '38 ms', delta: '\u221218%',     conf: 'high', src: 'Oura',  trend: [54,52,48,46,50,42,38] },
      { key: 'rhr',     label: 'Resting HR', value: '64 bpm', delta: '+6',           conf: 'high', src: 'Oura',  trend: [58,57,59,60,58,62,64] },
      { key: 'steps',   label: 'Steps',      value: '2,140', delta: 'so far',        conf: 'high', src: 'iPhone', trend: [9200, 4100, 11200, 7800, 6400, 3200, 2140] },
      { key: 'kcal',    label: 'Eaten',      value: '1,820', delta: 'est. \u00b1 220', conf: 'med',  src: 'photos', trend: [2200,2400,1900,2600,2100,2300,1820] },
      { key: 'protein', label: 'Protein',    value: '92 g',  delta: 'goal 140',      conf: 'med',  src: 'photos', trend: [110,120,95,140,100,85,92] },
      { key: 'weight',  label: 'Weight',     value: '\u2014',     delta: 'last Sat 184.2', conf: 'low',  src: 'manual', trend: [185.1,184.8,184.6,184.4,184.2,null,null] },
    ],
    timeline: [
      { t: '6:42 am', kind: 'sleep',  text: 'Woke up. Sleep score 64.',                          src: 'Oura' },
      { t: '7:10 am', kind: 'log',    text: 'Black coffee, oatmeal w/ blueberries.',             src: 'photo' },
      { t: '9:00 am', kind: 'meet',   text: 'Stacked meetings begin (4 back-to-back).',          src: 'calendar' },
      { t: '12:18 pm', kind: 'nudge', text: 'Walk window starts in 12 min.',                      src: 'OpenClaw' },
    ],
  },

  weekly: {
    weightTrend:    [185.6, 185.2, 184.9, 184.8, 184.6, 184.4, 184.2],
    deficitEst:     [-420, -180, -600, -220, -510, -340, -260],
    sleepHrs:       [7.1, 7.4, 7.8, 6.6, 7.2, 5.8, 6.2],
    recoveryPct:    [72, 78, 74, 66, 70, 52, 48],
    proteinG:       [110, 120, 95, 140, 100, 85, 92],
    days:           ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    headline:       'You\u2019re losing about 0.3 lb / week. The math says faster \u2014 the scale says trust the scale.',
    insight:        'Your wearable estimates a 365-kcal daily deficit. Your weight trend shows \u2248 150. Calorie burn is being over-counted by ~25%. I\u2019ve recalibrated.',
    wins: [
      'Protein floor held 5/7 days',
      'Walked 47k steps total',
      'Slept >7h three nights',
    ],
    misses: [
      'Two nights under 6.5h',
      'Two missed weigh-ins (Sat, Sun)',
      'Dinner skipped Thursday \u2014 hungrier Friday',
    ],
    nextWeek: [
      'Move the heaviest lift to Wednesday (best recovery night)',
      'Pre-portion breakfast oats Sun night (3 jars)',
      'Auto-order: chicken, eggs, greek yogurt, frozen berries',
    ],
  },

  chat: [
    { role: 'sys',  ts: '6:55 am', body: 'Slept 6h 12m. HRV down. I set today to yellow.' },
    { role: 'sys',  ts: '6:55 am', body: 'One thing: skip the lift, walk 25 min at lunch.' },
    { role: 'me',   ts: '7:12 am', body: 'ok. weigh-in?', kind: 'text' },
    { role: 'sys',  ts: '7:12 am', body: 'Step on. I\u2019ll read the scale.' },
    { role: 'me',   ts: '7:14 am', body: '184.0', kind: 'text' },
    { role: 'sys',  ts: '7:14 am', body: 'Logged. 7-day trend \u2212 0.9 lb.' },
    { role: 'me',   ts: '7:33 am', body: null, kind: 'photo', caption: 'breakfast' },
    { role: 'sys',  ts: '7:33 am', body: 'Oatmeal + blueberries + black coffee. \u2248 410 kcal, 12g protein. Saving as \u201cregular breakfast\u201d?' },
    { role: 'me',   ts: '7:34 am', body: 'yes', kind: 'text' },
    { role: 'sys',  ts: '12:18 pm', body: 'Walk window starts in 12 minutes. Phone weather: 68\u00b0F, clear.' },
  ],

  sources: [
    { name: 'Oura Ring',      role: 'sleep, hrv, rhr, temp',   status: 'connected', coverage: 0.96, sub: 'Membership active',    icon: 'ring' },
    { name: 'iPhone',         role: 'steps, daytime hr',       status: 'connected', coverage: 1.00, sub: 'HealthKit bridge',     icon: 'phone' },
    { name: 'Smart Scale',    role: 'weight, body comp',       status: 'pending',   coverage: 0.42, sub: 'Withings \u2014 set up', icon: 'scale' },
    { name: 'Apple Watch',    role: 'active hr, workouts',     status: 'off',       coverage: 0,    sub: 'Recommended next',     icon: 'watch' },
    { name: 'Meal photos',    role: 'food intake, macros',     status: 'connected', coverage: 0.81, sub: 'via OpenClaw chat',    icon: 'photo' },
    { name: 'Calendar',       role: 'load, meeting density',   status: 'connected', coverage: 1.00, sub: 'iCloud',               icon: 'cal' },
    { name: 'Lab results',    role: 'cholesterol, glucose',    status: 'off',       coverage: 0,    sub: 'Upload PDF',           icon: 'lab' },
  ],

  knownFoods: [
    { name: 'Regular breakfast', detail: 'Oats, blueberries, coffee', kcal: 410, protein: 12, count: 23 },
    { name: 'Tartine turkey',    detail: 'Lunch standby',             kcal: 720, protein: 38, count: 11 },
    { name: 'Trader Joe\u2019s salmon',  detail: 'Home dinner',        kcal: 540, protein: 44, count: 9 },
    { name: 'Chipotle bowl',     detail: 'Double chicken, no rice',   kcal: 650, protein: 58, count: 7 },
  ],
};

window.SAMPLE = SAMPLE;
