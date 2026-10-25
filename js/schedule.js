// מסך "היום": האימון של היום, התקדמות השבוע והלוח השבועי
import {
  getPlans, getPlan, planName, getSchedule, setScheduleDay, getActiveWorkout, getSessions,
  getPlanForDate, setPlanForDate, dateKey,
} from './storage.js';
import { esc, countLabel, DAY_NAMES, icon, iconChip, screenHead, shortDate } from './ui.js';
import { startWorkout } from './workout.js';

// איזה לוח מוצג: השבוע / שבוע הבא / הלוח הקבוע. נשמר כל עוד האפליקציה פתוחה
let view = 'this';

const VIEWS = [
  { id: 'this', label: 'השבוע' },
  { id: 'next', label: 'שבוע הבא' },
  { id: 'fixed', label: 'קבוע' },
];

// יום ראשון של השבוע הנוכחי (offset = 1 → של השבוע הבא)
function weekStart(offset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return d;
}

// "2026-10-27" → תאריך מקומי (בלי בעיות של אזורי זמן)
function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function renderToday(root) {
  const now = new Date();
  const dateText = now.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });

  // הכותרת מצוירת פעם אחת (היא עוברת לאזור הקבוע למעלה), והתוכן מתחתיה מתעדכן
  root.innerHTML = `${screenHead('היום', `יום ${DAY_NAMES[now.getDay()]}, ${dateText}`)}<div class="screen-body"></div>`;
  const body = root.querySelector('.screen-body');

  // בחירת אימון ליום - בלוח הקבוע או לתאריך מסוים
  body.addEventListener('change', (e) => {
    if (e.target.matches('select[data-day]')) {
      setScheduleDay(Number(e.target.dataset.day), e.target.value);
    } else if (e.target.matches('select[data-date]')) {
      setPlanForDate(parseKey(e.target.dataset.date), e.target.value);
    } else return;
    draw(body);
  });

  body.addEventListener('click', (e) => {
    const start = e.target.closest('[data-start]');
    if (start) startWorkout(start.dataset.start);

    const tab = e.target.closest('[data-view]');
    if (tab) {
      view = tab.dataset.view;
      draw(body);
    }
  });

  draw(body);
}

function draw(root) {
  const plans = getPlans();
  const now = new Date();
  const todayPlan = getPlan(getPlanForDate(now).planId);
  const active = getActiveWorkout();
  const todayIsActive = active && todayPlan && active.planId === todayPlan.id;

  root.innerHTML = `
    ${active && !todayIsActive ? `
      <a class="card row-card" href="#/workout">
        ${iconChip('zap', 'cyan')}
        <div class="grow">
          <div class="label">אימון בתהליך</div>
          <div class="card-title">${esc(active.planName)}</div>
        </div>
        <span class="btn btn-sm btn-primary">המשך</span>
      </a>` : ''}

    ${weekCard()}

    <div class="card">
      ${todayPlan ? `
        <div class="row-card">
          ${iconChip('dumbbell', 'green')}
          <div class="grow">
            <div class="label">האימון של היום</div>
            <div class="card-title card-title-lg">${esc(planName(todayPlan))}</div>
            <div class="label">${countLabel(todayPlan.exercises.length, 'תרגיל אחד', 'תרגילים')}</div>
          </div>
        </div>
        <button class="btn btn-primary btn-lg btn-block btn-glow card-action" data-start="${todayPlan.id}">
          ${icon('play')} ${todayIsActive ? 'המשך אימון' : 'התחל אימון'}
        </button>` : `
        <div class="row-card">
          ${iconChip('moon', 'cyan')}
          <div class="grow">
            <div class="card-title">יום מנוחה</div>
            <div class="label">גם מנוחה היא חלק מהאימון. רוצה להתאמן בכל זאת? בחר אימון בלשונית "תוכניות".</div>
          </div>
        </div>`}
    </div>

    <div class="section-head">${icon('calendar')}<h2>לוח שבועי</h2></div>
    ${plans.length ? `
      <div class="segmented" role="tablist">
        ${VIEWS.map((v) => `
          <button class="${view === v.id ? 'active' : ''}" data-view="${v.id}" role="tab">${v.label}</button>`).join('')}
      </div>
      <div class="week-hint label">${weekHint()}</div>
      ${view === 'fixed' ? fixedRows(plans) : datedRows(plans, view === 'next' ? 1 : 0)}`
      : `<div class="card empty-card">
          ${iconChip('calendar', 'muted')}
          <div class="card-title">עוד אין לוח שבועי</div>
          <div class="label">צור את האימון הראשון שלך, ואז תוכל לשבץ אותו בימים.</div>
          <a class="btn btn-primary" href="#/plans">${icon('plus')} לתוכניות</a>
        </div>`}
  `;
}

function weekHint() {
  if (view === 'fixed') return 'הלוח שחוזר כל שבוע. שינוי כאן חל על כל השבועות, חוץ מימים ששינית בנפרד.';
  const start = weekStart(view === 'next' ? 1 : 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${shortDate(start)} – ${shortDate(end)} · שינוי כאן חל רק על התאריך הזה`;
}

// שורות של שבוע מסוים, עם תאריכים
function datedRows(plans, offset) {
  const todayKey = dateKey(new Date());
  return DAY_NAMES.map((day, i) => {
    const date = weekStart(offset);
    date.setDate(date.getDate() + i);
    const key = dateKey(date);
    const { planId, override } = getPlanForDate(date);
    return dayRow({
      title: `${day} <span class="day-date">${shortDate(date)}</span>`,
      ariaDay: `${day} ${shortDate(date)}`,
      plan: getPlan(planId),
      plans,
      selected: planId,
      attr: `data-date="${key}"`,
      isToday: key === todayKey,
      isPast: key < todayKey,
      override,
    });
  }).join('');
}

// שורות הלוח הקבוע
function fixedRows(plans) {
  const schedule = getSchedule();
  return DAY_NAMES.map((day, i) => dayRow({
    title: day,
    ariaDay: day,
    plan: getPlan(schedule[i]),
    plans,
    selected: schedule[i],
    attr: `data-day="${i}"`,
    isToday: false,
    isPast: false,
    override: false,
  })).join('');
}

function dayRow({ title, ariaDay, plan, plans, selected, attr, isToday, isPast, override }) {
  return `
    <label class="card row-card day-row ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''}">
      ${plan ? iconChip('dumbbell', isToday ? 'green' : 'muted') : '<span class="icon-chip chip-muted">–</span>'}
      <div class="grow">
        <div class="day-name">
          ${title}
          ${isToday ? '<span class="tag">היום</span>' : ''}
          ${override ? '<span class="tag tag-cyan">שונה מהקבוע</span>' : ''}
        </div>
        <div class="label ${plan ? '' : 'is-rest'}">${plan ? esc(planName(plan)) : 'מנוחה'}</div>
      </div>
      <span class="day-edit">${icon('pencil')}</span>
      <!-- בחירת האימון: רשימה שקופה שמכסה את כל הכרטיס, לחיצה פותחת את הבורר של הטלפון -->
      <select class="day-select" ${attr} aria-label="אימון ליום ${ariaDay}">
        <option value="">מנוחה</option>
        ${plans.map((p) => `
          <option value="${p.id}" ${selected === p.id ? 'selected' : ''}>${esc(planName(p))}</option>`).join('')}
      </select>
    </label>`;
}

// כרטיס "השבוע": כמה אימונים עשית השבוע מתוך כמה שתכננת לשבוע הזה
function weekCard() {
  const start = weekStart(0);
  let planned = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (getPlan(getPlanForDate(d).planId)) planned++;
  }
  if (!planned) return '';

  const days = new Set(
    getSessions()
      .filter((s) => new Date(s.date) >= start)
      .map((s) => new Date(s.date).toDateString()),
  );
  const done = days.size;
  const pct = Math.min(100, Math.round((done / planned) * 100));

  return `
    <div class="card row-card">
      ${iconChip('flame', 'orange')}
      <div class="grow">
        <div class="label">השבוע</div>
        <div class="card-title card-title-lg">${done} מתוך ${planned} אימונים</div>
      </div>
      ${ring(pct)}
    </div>`;
}

// עיגול התקדמות
function ring(pct) {
  const r = 26;
  const len = 2 * Math.PI * r;
  return `
    <div class="ring">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="ring-track" cx="32" cy="32" r="${r}"/>
        ${pct ? `<circle class="ring-fill" cx="32" cy="32" r="${r}"
                 stroke-dasharray="${(len * pct) / 100} ${len}"/>` : ''}
      </svg>
      <span class="ring-text">${pct}%</span>
    </div>`;
}
