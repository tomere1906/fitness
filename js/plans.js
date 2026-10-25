// מסך תוכניות האימון: רשימת האימונים, ועריכה של אימון אחד
import { getPlans, getPlan, createPlan, deletePlan, planName, save, newId } from './storage.js';
import {
  esc, countLabel, stepper, bindSteppers, icon, iconChip, backLink, screenHead, emptyCard, confirmDialog,
} from './ui.js';
import { startWorkout, syncActiveWorkout } from './workout.js';

// ===== רשימת כל האימונים (#/plans) =====
export function renderPlans(root) {
  const plans = getPlans();

  root.innerHTML = `
    ${screenHead('תוכניות', 'בנה ונהל את האימונים שלך')}
    ${plans.length
      ? plans.map((p) => `
        <div class="card row-card">
          <a class="row-card grow plan-link" href="#/plans/${p.id}">
            ${iconChip('dumbbell', 'green')}
            <div class="grow">
              <div class="card-title">${esc(planName(p))}</div>
              <div class="label">${countLabel(p.exercises.length, 'תרגיל אחד', 'תרגילים')}</div>
            </div>
          </a>
          <button class="btn btn-sm btn-primary" data-start="${p.id}">${icon('play')} התחל</button>
        </div>`).join('')
      : emptyCard('dumbbell', 'עוד אין אימונים', 'צור את האימון הראשון שלך, למשל "אימון A - חזה וגב".')}
    <button class="btn btn-dashed btn-lg btn-block" data-action="new">${icon('plus')} אימון חדש</button>
  `;

  root.querySelector('[data-action="new"]').addEventListener('click', () => {
    const plan = createPlan();
    location.hash = `#/plans/${plan.id}`;
  });

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-start]');
    if (btn) startWorkout(btn.dataset.start);
  });
}

// ===== עריכת אימון אחד (#/plans/<id>) =====
export function renderPlanEditor(root, id) {
  const plan = getPlan(id);
  if (!plan) {
    root.innerHTML = `${backLink('#/plans', 'תוכניות')}
      ${emptyCard('dumbbell', 'האימון לא נמצא', 'ייתכן שהוא נמחק.')}`;
    return;
  }

  root.innerHTML = `
    ${backLink('#/plans', 'תוכניות')}
    ${screenHead('עריכת אימון', 'כל שינוי נשמר אוטומטית')}
    <label class="card field-card">
      <span class="field-label">שם האימון</span>
      <input class="input" id="plan-name" value="${esc(plan.name)}"
             placeholder='למשל "אימון A - חזה וגב"' enterkeyhint="done">
    </label>
    <div class="section-head">${icon('list')}<h2>תרגילים</h2></div>
    <div id="exercises"></div>
    <button class="btn btn-dashed btn-block" data-action="add-ex">${icon('plus')} הוסף תרגיל</button>
    <div class="footer-actions">
      <a class="btn btn-primary btn-lg btn-block" href="#/plans">${icon('check')} סיום</a>
      <button class="btn btn-danger btn-block" data-action="delete-plan">${icon('trash-2')} מחק את האימון</button>
    </div>
  `;

  const list = root.querySelector('#exercises');

  // שמירה + עדכון האימון הפעיל, אם יש אימון פתוח של התוכנית הזו
  function savePlan() {
    save();
    syncActiveWorkout(plan);
  }

  function renderExercises() {
    list.innerHTML = plan.exercises.length
      ? plan.exercises.map((ex, i) => `
        <div class="card ex-edit" data-index="${i}">
          <div class="ex-edit-head">
            <span class="ex-num">${i + 1}</span>
            <input class="input ex-name" value="${esc(ex.name)}" placeholder="שם התרגיל" enterkeyhint="done">
            <button class="btn btn-danger icon-btn" data-action="del-ex" aria-label="מחק תרגיל">${icon('x')}</button>
          </div>
          ${stepper({ field: 'sets', value: ex.sets, min: 1, label: 'סטים' })}
          ${stepper({ field: 'reps', value: ex.reps, min: 0, label: 'חזרות' })}
          ${stepper({ field: 'weight', value: ex.weight, step: 2.5, min: 0, decimal: true, label: 'משקל (ק״ג)' })}
          <div class="ex-move">
            <button class="btn btn-ghost" data-action="move" data-dir="-1" ${i === 0 ? 'disabled' : ''}>${icon('arrow-up')} הזז למעלה</button>
            <button class="btn btn-ghost" data-action="move" data-dir="1" ${i === plan.exercises.length - 1 ? 'disabled' : ''}>${icon('arrow-down')} הזז למטה</button>
          </div>
        </div>`).join('')
      : emptyCard('list', 'עוד אין תרגילים', 'הוסף את התרגיל הראשון עם הכפתור למטה.');
  }
  renderExercises();

  // שם האימון נשמר תוך כדי הקלדה
  root.querySelector('#plan-name').addEventListener('input', (e) => {
    plan.name = e.target.value;
    savePlan();
  });

  // שם התרגיל נשמר תוך כדי הקלדה
  list.addEventListener('input', (e) => {
    if (!e.target.classList.contains('ex-name')) return;
    const i = Number(e.target.closest('.ex-edit').dataset.index);
    plan.exercises[i].name = e.target.value;
    savePlan();
  });

  // סטים / חזרות / משקל
  bindSteppers(list, (stepperEl, value) => {
    const i = Number(stepperEl.closest('.ex-edit').dataset.index);
    plan.exercises[i][stepperEl.dataset.field] = value;
    savePlan();
  });

  // הזזת תרגיל למעלה / למטה בסדר האימון
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="move"]');
    if (!btn) return;
    const i = Number(btn.closest('.ex-edit').dataset.index);
    const to = i + Number(btn.dataset.dir);
    if (to < 0 || to >= plan.exercises.length) return;
    [plan.exercises[i], plan.exercises[to]] = [plan.exercises[to], plan.exercises[i]];
    savePlan();
    renderExercises();
    // מראים לאן התרגיל עבר
    const moved = list.querySelector(`.ex-edit[data-index="${to}"]`);
    moved.scrollIntoView({ behavior: 'smooth', block: 'center' });
    moved.classList.add('just-moved');
  });

  // מחיקת תרגיל
  list.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-action="del-ex"]')) return;
    const i = Number(e.target.closest('.ex-edit').dataset.index);
    const name = plan.exercises[i].name.trim();
    if (name && !(await confirmDialog({ title: `למחוק את "${name}"?`, confirmText: 'מחק', danger: true }))) return;
    plan.exercises.splice(i, 1);
    savePlan();
    renderExercises();
  });

  // הוספת תרגיל - עם ערכים התחלתיים, והמקלדת נפתחת על השם
  root.querySelector('[data-action="add-ex"]').addEventListener('click', () => {
    plan.exercises.push({ id: newId(), name: '', sets: 3, reps: 10, weight: 0 });
    savePlan();
    renderExercises();
    const inputs = list.querySelectorAll('.ex-name');
    inputs[inputs.length - 1].focus();
  });

  // מחיקת האימון כולו
  root.querySelector('[data-action="delete-plan"]').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: `למחוק את "${planName(plan)}"?`,
      message: 'אי אפשר לבטל את זה. ההיסטוריה של האימונים שכבר עשית תישאר.',
      confirmText: 'מחק אימון',
      danger: true,
    });
    if (!ok) return;
    deletePlan(plan.id);
    location.hash = '#/plans';
  });

  // אימון חדש - פותחים ישר את המקלדת על השם
  if (!plan.name) root.querySelector('#plan-name').focus();
}
