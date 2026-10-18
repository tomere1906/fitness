// מסך היסטוריה: סוגי אימונים → תאריכים → התרגילים והמשקלים באותו אימון.
// המטרה: לראות שאתה עקבי, ולזהות תרגיל שיורד כמה פעמים ברצף.
import { getSessionsByDate, getPlan, exerciseKey } from './storage.js';
import {
  esc, fmtNum, countLabel, shortDate, longDate, icon, iconChip, backLink, screenHead, emptyCard,
} from './ui.js';

// אחרי כמה ירידות ברצף מתריעים
export const DECLINE_ALERT = 2;

// ===== חישוב מגמות =====

// סיכום של תרגיל באימון אחד: המשקל הכבד ביותר וסך החזרות
function summarize(sets) {
  return {
    top: Math.max(...sets.map((s) => s.weight)),
    reps: sets.reduce((sum, s) => sum + s.reps, 0),
  };
}

// 1 = עלייה, 0 = יציב, -1 = ירידה.
// משווים את המשקל הכבד ביותר; אם הוא זהה - את סך החזרות
function compare(sets, prevSets) {
  const now = summarize(sets);
  const before = summarize(prevSets);
  if (now.top !== before.top) return now.top > before.top ? 1 : -1;
  if (now.reps !== before.reps) return now.reps > before.reps ? 1 : -1;
  return 0;
}

// כל האימונים שבוצעו, מקובצים לפי סוג אימון.
// לכל תרגיל בכל אימון מחושבים: trend (מגמה מול הפעם הקודמת באותו סוג אימון),
// streak (כמה ירידות ברצף), prev (מה היה בפעם הקודמת)
export function getPlanHistory() {
  const plans = new Map();

  for (const session of getSessionsByDate()) {
    if (!plans.has(session.planId)) {
      plans.set(session.planId, { planId: session.planId, name: session.planName, sessions: [], last: new Map() });
    }
    const plan = plans.get(session.planId);
    plan.name = session.planName;

    plan.sessions.push({
      id: session.id,
      date: session.date,
      exercises: session.exercises.map((ex) => {
        const key = exerciseKey(ex.name);
        const prev = plan.last.get(key);
        const trend = prev ? compare(ex.sets, prev.sets) : null;
        const streak = trend === -1 ? prev.streak + 1 : 0;
        plan.last.set(key, { sets: ex.sets, date: session.date, streak });
        return { name: ex.name, sets: ex.sets, trend, streak, prev };
      }),
    });
  }

  return [...plans.values()].map((plan) => ({
    planId: plan.planId,
    // אם התוכנית עוד קיימת - השם העדכני שלה
    name: getPlan(plan.planId)?.name.trim() || plan.name,
    sessions: plan.sessions,
    // תרגילים שכרגע (בפעם האחרונה שעשית אותם) בירידה רציפה
    warnings: [...plan.last.entries()]
      .filter(([, v]) => v.streak >= DECLINE_ALERT)
      .map(([key]) => key),
  }));
}

// כמה ירידות ברצף יש כרגע לתרגיל מסוים באימון מסוים (משמש את מסך האימון הפעיל)
export function currentDeclineStreak(planId, name) {
  const plan = getPlanHistory().find((p) => p.planId === planId);
  if (!plan) return 0;
  const key = exerciseKey(name);
  for (let i = plan.sessions.length - 1; i >= 0; i--) {
    const ex = plan.sessions[i].exercises.find((e) => exerciseKey(e.name) === key);
    if (ex) return ex.streak;
  }
  return 0;
}

// ===== המסכים =====

export function renderHistory(root, planId, sessionId) {
  const history = getPlanHistory();
  if (sessionId) renderSession(root, history, decodeURIComponent(planId), sessionId);
  else if (planId) renderPlanSessions(root, history, decodeURIComponent(planId));
  else renderPlanList(root, history);
}

// --- רמה 1: סוגי האימונים ---
function renderPlanList(root, history) {
  const plans = history.sort((a, b) => lastDate(b).localeCompare(lastDate(a)));

  root.innerHTML = `
    ${screenHead('היסטוריה', 'עקביות היא המטרה: האם אתה שומר על הביצועים?')}
    ${plans.length
      ? plans.map((p) => `
        <a class="card row-card" href="#/history/${encodeURIComponent(p.planId)}">
          ${iconChip(p.warnings.length ? 'alert' : 'chart', p.warnings.length ? 'orange' : 'green')}
          <div class="grow">
            <div class="card-title">${esc(p.name)}</div>
            <div class="label">${countLabel(p.sessions.length, 'אימון אחד', 'אימונים')} · אחרון ${shortDate(lastDate(p))}</div>
            ${p.warnings.length
              ? `<div class="trend-down small">${countLabel(p.warnings.length, 'תרגיל אחד', 'תרגילים')} בירידה רציפה</div>`
              : '<div class="trend-up small">עקבי ✓</div>'}
          </div>
          <span class="chevron">${icon('chevron')}</span>
        </a>`).join('')
      : emptyCard('chart', 'עוד אין היסטוריה', 'אחרי שתסיים ותשמור את האימון הראשון, הוא יופיע כאן.')}
  `;
}

// --- רמה 2: התאריכים של אימון אחד ---
function renderPlanSessions(root, history, planId) {
  const plan = history.find((p) => p.planId === planId);
  if (!plan) return notFound(root);

  root.innerHTML = `
    ${backLink('#/history', 'היסטוריה')}
    ${screenHead(esc(plan.name), countLabel(plan.sessions.length, 'אימון אחד', 'אימונים'))}
    ${[...plan.sessions].reverse().map((s) => `
      <a class="card row-card" href="#/history/${encodeURIComponent(planId)}/${s.id}">
        ${iconChip('calendar', 'muted')}
        <div class="grow">
          <div class="card-title">${longDate(s.date)}</div>
          <div class="small">${sessionSummary(s)}</div>
        </div>
        <span class="chevron">${icon('chevron')}</span>
      </a>`).join('')}
  `;
}

// --- רמה 3: אימון אחד - התרגילים, הסטים, והשוואה לפעם הקודמת ---
function renderSession(root, history, planId, sessionId) {
  const plan = history.find((p) => p.planId === planId);
  const session = plan?.sessions.find((s) => s.id === sessionId);
  if (!session) return notFound(root);

  root.innerHTML = `
    ${backLink(`#/history/${encodeURIComponent(planId)}`, esc(plan.name))}
    ${screenHead(longDate(session.date), esc(plan.name))}
    ${session.exercises.map((ex) => `
      <div class="card">
        <div class="row-card session-ex-head">
          ${iconChip('dumbbell', ex.trend === 1 ? 'green' : ex.trend === -1 ? 'orange' : 'muted')}
          <div class="grow card-title">${esc(ex.name)}</div>
          ${trendBadge(ex)}
        </div>
        ${ex.streak >= DECLINE_ALERT
          ? `<div class="trend-alert small">${icon('alert')} ירידה ${ex.streak} פעמים ברצף</div>` : ''}
        <div class="set-chips">${setChips(ex.sets)}</div>
        ${ex.prev ? `
          <div class="prev-line small muted">פעם קודמת (${shortDate(ex.prev.date)}):</div>
          <div class="set-chips set-chips-dim">${setChips(ex.prev.sets)}</div>` : ''}
      </div>`).join('')}
  `;
}

// ===== עזרים לתצוגה =====

function lastDate(plan) {
  return plan.sessions[plan.sessions.length - 1].date;
}

function notFound(root) {
  root.innerHTML = `${backLink('#/history', 'היסטוריה')}
    ${emptyCard('chart', 'לא נמצא', 'ייתכן שהאימון הזה כבר לא קיים.')}`;
}

const TRENDS = {
  1: { cls: 'trend-up', icon: '↑', one: 'עלה', many: 'עלו', label: 'עלייה' },
  0: { cls: 'trend-same', icon: '=', one: 'יציב', many: 'יציבים', label: 'יציב' },
  '-1': { cls: 'trend-down', icon: '↓', one: 'ירד', many: 'ירדו', label: 'ירידה' },
};

// "↑ 1 עלה · = 2 יציבים · ↓ 1 ירד"
function sessionSummary(session) {
  const parts = [1, 0, -1].map((t) => {
    const n = session.exercises.filter((ex) => ex.trend === t).length;
    if (!n) return '';
    const tr = TRENDS[t];
    return `<span class="${tr.cls}">${tr.icon} ${n} ${n === 1 ? tr.one : tr.many}</span>`;
  }).filter(Boolean);
  return parts.length ? parts.join(' <span class="muted">·</span> ') : '<span class="muted">פעם ראשונה</span>';
}

function trendBadge(ex) {
  if (ex.trend === null) return '<span class="trend-badge trend-same">חדש</span>';
  const tr = TRENDS[ex.trend];
  return `<span class="trend-badge ${tr.cls}">${tr.icon} ${tr.label}</span>`;
}

function setChips(sets) {
  return sets.map((s) => `
    <span class="set-chip">${s.weight ? `<b>${fmtNum(s.weight)}</b> ק״ג × ` : ''}<b>${s.reps}</b>${s.weight ? '' : ' חזרות'}</span>`).join('');
}
