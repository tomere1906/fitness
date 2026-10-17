// מסך "היום": האימון של היום + הלוח השבועי
import { getPlans, getPlan, planName, getSchedule, setScheduleDay, getActiveWorkout } from './storage.js';
import { esc, countLabel, DAY_NAMES } from './ui.js';
import { startWorkout } from './workout.js';

export function renderToday(root) {
  const today = new Date().getDay(); // 0 = ראשון

  root.addEventListener('change', (e) => {
    if (!e.target.matches('select[data-day]')) return;
    setScheduleDay(Number(e.target.dataset.day), e.target.value);
    // אם שינינו את היום של היום - מציירים מחדש, כדי לעדכן את הכרטיס למעלה
    if (Number(e.target.dataset.day) === today) draw(root, today);
  });

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-start]');
    if (btn) startWorkout(btn.dataset.start);
  });

  draw(root, today);
}

function draw(root, today) {
  const plans = getPlans();
  const schedule = getSchedule();
  const todayPlan = getPlan(schedule[today]);
  const active = getActiveWorkout();
  const todayIsActive = active && todayPlan && active.planId === todayPlan.id;

  root.innerHTML = `
    <h1>יום ${DAY_NAMES[today]}</h1>

    ${active && !todayIsActive ? `
      <a class="card active-banner" href="#/workout">
        <div>
          <div class="muted small">אימון בתהליך</div>
          <div class="plan-card-title">${esc(active.planName)}</div>
        </div>
        <span class="btn btn-primary">המשך</span>
      </a>` : ''}

    <div class="card today-card">
      ${todayPlan
        ? `<div class="muted small">האימון של היום</div>
           <div class="today-title">${esc(planName(todayPlan))}</div>
           <div class="muted small">${countLabel(todayPlan.exercises.length, 'תרגיל אחד', 'תרגילים')}</div>
           <button class="btn btn-primary btn-lg btn-block" data-start="${todayPlan.id}">
             ${todayIsActive ? 'המשך אימון' : 'התחל אימון'}
           </button>`
        : `<div class="today-title">יום מנוחה 😴</div>
           <div class="muted small">רוצה להתאמן בכל זאת? בחר אימון בלשונית "תוכניות".</div>`}
    </div>

    <h2>לוח שבועי</h2>
    ${plans.length
      ? `<div class="card week">
          ${DAY_NAMES.map((day, i) => `
            <label class="week-row ${i === today ? 'is-today' : ''}">
              <span class="week-day">${day}</span>
              <select class="select" data-day="${i}">
                <option value="">מנוחה</option>
                ${plans.map((p) => `
                  <option value="${p.id}" ${schedule[i] === p.id ? 'selected' : ''}>${esc(planName(p))}</option>`).join('')}
              </select>
            </label>`).join('')}
        </div>`
      : `<div class="empty">כדי לבנות לוח שבועי, צור קודם אימון.
           <br><br><a class="btn btn-primary" href="#/plans">לתוכניות</a></div>`}
  `;
}
