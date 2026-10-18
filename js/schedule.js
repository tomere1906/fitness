// מסך "היום": האימון של היום, התקדמות השבוע והלוח השבועי
import {
  getPlans, getPlan, planName, getSchedule, setScheduleDay, getActiveWorkout, getSessions,
} from './storage.js';
import { esc, countLabel, DAY_NAMES, icon, iconChip, screenHead } from './ui.js';
import { startWorkout } from './workout.js';

export function renderToday(root) {
  const today = new Date().getDay(); // 0 = ראשון
  const dateText = new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });

  // הכותרת מצוירת פעם אחת (היא עוברת לאזור הקבוע למעלה), והתוכן מתחתיה מתעדכן
  root.innerHTML = `${screenHead('היום', `יום ${DAY_NAMES[today]}, ${dateText}`)}<div class="screen-body"></div>`;
  const body = root.querySelector('.screen-body');

  // בחירת אימון ליום בלוח - שומרים ומציירים מחדש
  body.addEventListener('change', (e) => {
    if (!e.target.matches('select[data-day]')) return;
    setScheduleDay(Number(e.target.dataset.day), e.target.value);
    draw(body, today);
  });

  body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-start]');
    if (btn) startWorkout(btn.dataset.start);
  });

  draw(body, today);
}

function draw(root, today) {
  const plans = getPlans();
  const schedule = getSchedule();
  const todayPlan = getPlan(schedule[today]);
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

    ${weekCard(schedule)}

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
    ${plans.length
      ? DAY_NAMES.map((day, i) => {
        const plan = getPlan(schedule[i]);
        const isToday = i === today;
        return `
          <label class="card row-card day-row ${isToday ? 'is-today' : ''}">
            ${plan ? iconChip('dumbbell', isToday ? 'green' : 'muted') : '<span class="icon-chip chip-muted">–</span>'}
            <div class="grow">
              <div class="day-name">${day} ${isToday ? '<span class="tag">היום</span>' : ''}</div>
              <div class="label ${plan ? '' : 'is-rest'}">${plan ? esc(planName(plan)) : 'מנוחה'}</div>
            </div>
            <span class="day-edit">${icon('pencil')}</span>
            <!-- בחירת האימון: רשימה שקופה שמכסה את כל הכרטיס, לחיצה פותחת את הבורר של הטלפון -->
            <select class="day-select" data-day="${i}" aria-label="אימון ליום ${day}">
              <option value="">מנוחה</option>
              ${plans.map((p) => `
                <option value="${p.id}" ${schedule[i] === p.id ? 'selected' : ''}>${esc(planName(p))}</option>`).join('')}
            </select>
          </label>`;
      }).join('')
      : `<div class="card empty-card">
          ${iconChip('calendar', 'muted')}
          <div class="card-title">עוד אין לוח שבועי</div>
          <div class="label">צור את האימון הראשון שלך, ואז תוכל לשבץ אותו בימים.</div>
          <a class="btn btn-primary" href="#/plans">${icon('plus')} לתוכניות</a>
        </div>`}
  `;
}

// כרטיס "השבוע": כמה אימונים עשית השבוע מתוך כמה שתכננת בלוח
function weekCard(schedule) {
  const planned = schedule.filter(Boolean).length;
  if (!planned) return '';

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // יום ראשון האחרון
  const days = new Set(
    getSessions()
      .filter((s) => new Date(s.date) >= weekStart)
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
