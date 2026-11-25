// עריכת אימון שכבר נשמר (#/history/<אימון>/<תאריך>/edit):
// שינוי משקל וחזרות, הוספה והסרה של סטים, מחיקת תרגיל או את כל האימון.
// כל שינוי נשמר מיד, וההיסטוריה (מגמות, השוואה לתכנון) מתעדכנת לבד.
import { getSession, deleteSession, save } from './storage.js';
import {
  esc, icon, iconChip, backLink, screenHead, emptyCard, longDate, stepper, bindSteppers, confirmDialog,
} from './ui.js';

export function renderSessionEditor(root, planId, sessionId) {
  const listHref = `#/history/${encodeURIComponent(planId)}`;
  const session = getSession(sessionId);
  if (!session) {
    root.innerHTML = `${backLink(listHref, 'חזרה')}
      ${emptyCard('history', 'האימון לא נמצא', 'ייתכן שהוא נמחק.')}`;
    return;
  }

  const viewHref = `${listHref}/${sessionId}`;
  root.innerHTML = `
    ${backLink(viewHref, 'חזרה לאימון')}
    ${screenHead('עריכת אימון', `${longDate(session.date)} · ${esc(session.planName)}`)}
    <div id="ex-list"></div>
    <div class="footer-actions">
      <a class="btn btn-primary btn-lg btn-block" href="${viewHref}">${icon('check')} סיום</a>
      <button class="btn btn-danger btn-block" data-action="delete-session">${icon('trash-2')} מחק את כל האימון</button>
    </div>
  `;

  const list = root.querySelector('#ex-list');

  function draw() {
    list.innerHTML = session.exercises.length
      ? session.exercises.map((ex, i) => `
        <section class="card ex" data-ex="${i}">
          <div class="row-card ex-head">
            ${iconChip('dumbbell', 'muted')}
            <div class="grow card-title">${esc(ex.name)}</div>
            <button class="btn btn-danger icon-btn" data-action="del-ex" aria-label="מחק תרגיל">${icon('trash-2')}</button>
          </div>
          <div class="set-grid set-head"><span>סט</span><span>משקל (ק״ג)</span><span>חזרות</span></div>
          ${ex.sets.map((s, j) => `
            <div class="set-grid set-row" data-set="${j}">
              <span class="set-num">${j + 1}</span>
              ${stepper({ field: 'weight', value: s.weight, step: 2.5, decimal: true })}
              ${stepper({ field: 'reps', value: s.reps })}
            </div>`).join('')}
          <div class="ex-actions">
            <button class="btn btn-ghost" data-action="remove-set" ${ex.sets.length <= 1 ? 'disabled' : ''}>${icon('minus')} הסר סט</button>
            <button class="btn btn-ghost" data-action="add-set">${icon('plus')} הוסף סט</button>
          </div>
        </section>`).join('')
      : emptyCard('dumbbell', 'אין תרגילים באימון הזה', 'אפשר למחוק את האימון עם הכפתור למטה.');
  }
  draw();

  // מאיזה תרגיל (ואיזה סט) הגיע האירוע
  const where = (el) => ({
    ex: session.exercises[Number(el.closest('.ex').dataset.ex)],
    i: Number(el.closest('.ex').dataset.ex),
    j: el.closest('.set-row') ? Number(el.closest('.set-row').dataset.set) : -1,
  });

  // משקל / חזרות
  bindSteppers(list, (stepperEl, value) => {
    const { ex, j } = where(stepperEl);
    ex.sets[j][stepperEl.dataset.field] = value;
    save();
  });

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { ex, i } = where(btn);

    if (btn.dataset.action === 'add-set') {
      const last = ex.sets[ex.sets.length - 1];
      ex.sets.push({ weight: last.weight, reps: last.reps });
    }
    if (btn.dataset.action === 'remove-set' && ex.sets.length > 1) {
      ex.sets.pop();
    }
    if (btn.dataset.action === 'del-ex') {
      const ok = await confirmDialog({
        title: `למחוק את "${ex.name}" מהאימון הזה?`,
        message: 'התרגיל יימחק רק מהאימון הזה, לא מהתוכנית.',
        confirmText: 'מחק',
        danger: true,
      });
      if (!ok) return;
      session.exercises.splice(i, 1);
    }
    save();
    draw();
  });

  root.querySelector('[data-action="delete-session"]').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'למחוק את כל האימון?',
      message: `האימון מ${longDate(session.date)} יימחק מההיסטוריה. אי אפשר לבטל את זה.`,
      confirmText: 'מחק אימון',
      danger: true,
    });
    if (!ok) return;
    deleteSession(session.id);
    location.hash = listHref;
  });
}
