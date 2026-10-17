// מסך אימון פעיל: מזינים חזרות ומשקל לכל סט, ובסוף שומרים
import {
  getPlan, planName, getActiveWorkout, setActiveWorkout,
  addSession, getLastPerformance, newId,
} from './storage.js';
import { esc, fmtNum, toast, stepper, bindSteppers, shortDate } from './ui.js';

// ===== התחלת אימון מתוך תוכנית =====
export function startWorkout(planId) {
  const plan = getPlan(planId);
  if (!plan) return;

  const active = getActiveWorkout();
  if (active) {
    // אותו אימון כבר פתוח - פשוט ממשיכים בו
    if (active.planId === planId) {
      location.hash = '#/workout';
      return;
    }
    if (!confirm(`האימון "${active.planName}" עוד פתוח ולא נשמר. לבטל אותו ולהתחיל אימון חדש?`)) return;
  }

  if (!plan.exercises.length) {
    toast('אין תרגילים באימון הזה');
    location.hash = `#/plans/${plan.id}`;
    return;
  }

  setActiveWorkout({
    planId: plan.id,
    planName: planName(plan),
    startedAt: new Date().toISOString(),
    exercises: plan.exercises.map((ex) => {
      const last = getLastPerformance(ex.name);
      return {
        name: ex.name.trim() || 'תרגיל ללא שם',
        planned: { sets: ex.sets, reps: ex.reps, weight: ex.weight },
        previous: last,
        // כל סט ממולא מראש: מה שעשית בפעם הקודמת, ואם אין - מה שמתוכנן
        sets: Array.from({ length: ex.sets }, (_, j) => {
          const prev = last?.sets[j];
          return {
            weight: prev ? prev.weight : ex.weight,
            reps: prev ? prev.reps : ex.reps,
            done: false,
          };
        }),
      };
    }),
  });
  location.hash = '#/workout';
}

// ===== המסך (#/workout) =====
export function renderWorkout(root) {
  const w = getActiveWorkout();
  if (!w) {
    root.innerHTML = `<div class="empty">אין אימון פעיל כרגע</div>
      <a class="btn btn-primary btn-block" href="#/today">למסך היום</a>`;
    return;
  }

  root.innerHTML = `
    <h1>${esc(w.planName)}</h1>
    <div class="workout-progress muted" id="progress"></div>
    ${w.exercises.map((ex, i) => `
      <section class="card ex" data-ex="${i}">${exerciseHtml(ex)}</section>`).join('')}
    <div class="footer-actions">
      <button class="btn btn-primary btn-lg btn-block" data-action="finish">סיים ושמור אימון</button>
      <button class="btn btn-danger btn-block" data-action="cancel">בטל אימון</button>
    </div>
  `;
  updateProgress(root, w);

  // מאיזה תרגיל ואיזה סט הגיע האירוע
  const where = (el) => ({
    ex: w.exercises[Number(el.closest('.ex').dataset.ex)],
    exEl: el.closest('.ex'),
    j: el.closest('.set-row') ? Number(el.closest('.set-row').dataset.set) : -1,
  });

  // שינוי משקל / חזרות
  bindSteppers(root, (stepperEl, value) => {
    const { ex, j } = where(stepperEl);
    ex.sets[j][stepperEl.dataset.field] = value;
    setActiveWorkout(w);
  });

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'toggle') {
      const { ex, j } = where(btn);
      const set = ex.sets[j];
      set.done = !set.done;
      setActiveWorkout(w);
      btn.closest('.set-row').classList.toggle('done', set.done);
      btn.textContent = set.done ? '✓' : j + 1;
      updateProgress(root, w);
    }

    if (action === 'add-set') {
      const { ex, exEl } = where(btn);
      const last = ex.sets[ex.sets.length - 1] || ex.planned;
      ex.sets.push({ weight: last.weight, reps: last.reps, done: false });
      setActiveWorkout(w);
      exEl.innerHTML = exerciseHtml(ex);
      updateProgress(root, w);
    }

    if (action === 'remove-set') {
      const { ex, exEl } = where(btn);
      if (ex.sets.length <= 1) return;
      if (ex.sets[ex.sets.length - 1].done && !confirm('הסט האחרון כבר סומן כבוצע. להסיר אותו?')) return;
      ex.sets.pop();
      setActiveWorkout(w);
      exEl.innerHTML = exerciseHtml(ex);
      updateProgress(root, w);
    }

    if (action === 'finish') finishWorkout(w);

    if (action === 'cancel') {
      if (!confirm('לבטל את האימון? מה שהזנת לא יישמר.')) return;
      setActiveWorkout(null);
      location.hash = '#/today';
    }
  });
}

function finishWorkout(w) {
  const all = w.exercises.flatMap((ex) => ex.sets);
  const done = all.filter((s) => s.done).length;

  if (done === 0) {
    alert('עוד לא סימנת אף סט כבוצע. לחץ על מספר הסט כדי לסמן אותו.');
    return;
  }
  if (done < all.length && !confirm(`סימנת ${done} מתוך ${all.length} סטים. לשמור רק את הסטים שסימנת?`)) return;

  addSession({
    id: newId(),
    planId: w.planId,
    planName: w.planName,
    date: w.startedAt,
    exercises: w.exercises
      .map((ex) => ({
        name: ex.name,
        sets: ex.sets.filter((s) => s.done).map((s) => ({ weight: s.weight, reps: s.reps })),
      }))
      .filter((ex) => ex.sets.length),
  });
  setActiveWorkout(null);
  toast('האימון נשמר 💪');
  location.hash = '#/today';
}

function updateProgress(root, w) {
  const all = w.exercises.flatMap((ex) => ex.sets);
  const done = all.filter((s) => s.done).length;
  root.querySelector('#progress').textContent = `${done} מתוך ${all.length} סטים בוצעו`;
}

// ===== HTML של תרגיל אחד =====
function exerciseHtml(ex) {
  const p = ex.planned;
  return `
    <div class="ex-title">${esc(ex.name)}</div>
    <div class="muted small">מתוכנן: ${p.sets} סטים × ${p.reps} חזרות${p.weight ? ` · ${fmtNum(p.weight)} ק״ג` : ''}</div>
    ${ex.previous ? `
      <div class="ex-prev small">פעם קודמת (${shortDate(ex.previous.date)}): ${formatSets(ex.previous.sets)}</div>` : ''}

    <div class="set-grid set-head">
      <span>סט</span><span>משקל (ק״ג)</span><span>חזרות</span>
    </div>
    ${ex.sets.map((s, j) => `
      <div class="set-grid set-row ${s.done ? 'done' : ''}" data-set="${j}">
        <button class="set-done" data-action="toggle" aria-label="סט ${j + 1} - סמן כבוצע">${s.done ? '✓' : j + 1}</button>
        ${stepper({ field: 'weight', value: s.weight, step: 2.5, decimal: true })}
        ${stepper({ field: 'reps', value: s.reps })}
      </div>`).join('')}

    <div class="ex-actions">
      <button class="btn btn-ghost" data-action="remove-set">− הסר סט</button>
      <button class="btn btn-ghost" data-action="add-set">+ הוסף סט</button>
    </div>`;
}

// "40 ק״ג: 10, 10, 8 חזרות" או "40 ק״ג × 10 · 45 ק״ג × 8"
function formatSets(sets) {
  const sameWeight = sets.every((s) => s.weight === sets[0].weight);
  if (sameWeight) {
    const reps = `${sets.map((s) => s.reps).join(', ')} חזרות`;
    return sets[0].weight ? `${fmtNum(sets[0].weight)} ק״ג: ${reps}` : reps;
  }
  return sets.map((s) => `${fmtNum(s.weight)} ק״ג × ${s.reps}`).join(' · ');
}
