// מסך תוכניות האימון: רשימת האימונים, ועריכה של אימון אחד
import { getPlans, getPlan, createPlan, deletePlan, planName, save, newId } from './storage.js';
import { esc, fmtNum, countLabel, stepper, bindSteppers } from './ui.js';

// ===== רשימת כל האימונים (#/plans) =====
export function renderPlans(root) {
  const plans = getPlans();

  root.innerHTML = `
    <h1>תוכניות אימון</h1>
    ${plans.length
      ? plans.map((p) => `
        <div class="card plan-card">
          <a class="plan-card-main" href="#/plans/${p.id}">
            <div class="plan-card-title">${esc(planName(p))}</div>
            <div class="muted small">${countLabel(p.exercises.length, 'תרגיל אחד', 'תרגילים')}</div>
          </a>
        </div>`).join('')
      : `<div class="empty">עוד אין אימונים.<br>צור את הראשון!</div>`}
    <button class="btn btn-primary btn-lg btn-block" data-action="new">+ אימון חדש</button>
  `;

  root.querySelector('[data-action="new"]').addEventListener('click', () => {
    const plan = createPlan();
    location.hash = `#/plans/${plan.id}`;
  });
}

// ===== עריכת אימון אחד (#/plans/<id>) =====
export function renderPlanEditor(root, id) {
  const plan = getPlan(id);
  if (!plan) {
    root.innerHTML = `<div class="empty">האימון לא נמצא</div>
      <a class="btn btn-block" href="#/plans">חזרה לתוכניות</a>`;
    return;
  }

  root.innerHTML = `
    <a class="back-link" href="#/plans">→ תוכניות</a>
    <label class="field">
      <span class="field-label">שם האימון</span>
      <input class="input" id="plan-name" value="${esc(plan.name)}"
             placeholder='למשל "אימון A - חזה וגב"' enterkeyhint="done">
    </label>
    <h2>תרגילים</h2>
    <div id="exercises"></div>
    <button class="btn btn-block" data-action="add-ex">+ הוסף תרגיל</button>
    <div class="footer-actions">
      <a class="btn btn-primary btn-lg btn-block" href="#/plans">סיום</a>
      <button class="btn btn-danger btn-block" data-action="delete-plan">מחק את האימון</button>
    </div>
  `;

  const list = root.querySelector('#exercises');

  function renderExercises() {
    list.innerHTML = plan.exercises.length
      ? plan.exercises.map((ex, i) => `
        <div class="card ex-edit" data-index="${i}">
          <div class="ex-edit-head">
            <input class="input ex-name" value="${esc(ex.name)}" placeholder="שם התרגיל" enterkeyhint="done">
            <button class="btn btn-danger icon-btn" data-action="del-ex" aria-label="מחק תרגיל">✕</button>
          </div>
          ${stepper({ field: 'sets', value: ex.sets, min: 1, label: 'סטים' })}
          ${stepper({ field: 'reps', value: ex.reps, min: 0, label: 'חזרות' })}
          ${stepper({ field: 'weight', value: ex.weight, step: 2.5, min: 0, decimal: true, label: 'משקל (ק״ג)' })}
        </div>`).join('')
      : `<div class="empty small">עוד אין תרגילים באימון הזה</div>`;
  }
  renderExercises();

  // שם האימון נשמר תוך כדי הקלדה
  root.querySelector('#plan-name').addEventListener('input', (e) => {
    plan.name = e.target.value;
    save();
  });

  // שם התרגיל נשמר תוך כדי הקלדה
  list.addEventListener('input', (e) => {
    if (!e.target.classList.contains('ex-name')) return;
    const i = Number(e.target.closest('.ex-edit').dataset.index);
    plan.exercises[i].name = e.target.value;
    save();
  });

  // סטים / חזרות / משקל
  bindSteppers(list, (stepperEl, value) => {
    const i = Number(stepperEl.closest('.ex-edit').dataset.index);
    plan.exercises[i][stepperEl.dataset.field] = value;
    save();
  });

  // מחיקת תרגיל
  list.addEventListener('click', (e) => {
    if (!e.target.closest('[data-action="del-ex"]')) return;
    const i = Number(e.target.closest('.ex-edit').dataset.index);
    const name = plan.exercises[i].name.trim();
    if (name && !confirm(`למחוק את התרגיל "${name}"?`)) return;
    plan.exercises.splice(i, 1);
    save();
    renderExercises();
  });

  // הוספת תרגיל - עם ערכים התחלתיים, והמקלדת נפתחת על השם
  root.querySelector('[data-action="add-ex"]').addEventListener('click', () => {
    plan.exercises.push({ id: newId(), name: '', sets: 3, reps: 10, weight: 0 });
    save();
    renderExercises();
    const inputs = list.querySelectorAll('.ex-name');
    inputs[inputs.length - 1].focus();
  });

  // מחיקת האימון כולו
  root.querySelector('[data-action="delete-plan"]').addEventListener('click', () => {
    if (!confirm(`למחוק את "${planName(plan)}"? אי אפשר לבטל את זה.`)) return;
    deletePlan(plan.id);
    location.hash = '#/plans';
  });

  // אימון חדש - פותחים ישר את המקלדת על השם
  if (!plan.name) root.querySelector('#plan-name').focus();
}
