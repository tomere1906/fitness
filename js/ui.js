// כלי עזר קטנים שמשותפים לכל המסכים

// מונע מטקסט שהמשתמש הקליד "לשבור" את ה-HTML (למשל אם יש בו < או ")
export function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// מציג מספר בלי אפסים מיותרים: 40.0 → 40, 42.50 → 42.5
export function fmtNum(n) {
  return String(Math.round((Number(n) || 0) * 100) / 100);
}

// ===== אייקונים (Lucide) =====
import { ICONS } from './icons.js';

export function icon(name) {
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

// אייקון בתוך עיגול רך. color: green / cyan / orange / red / muted
export function iconChip(name, color = 'green') {
  return `<span class="icon-chip chip-${color}">${icon(name)}</span>`;
}

// קישור "חזרה" בראש מסך פנימי (חץ ימינה = אחורה בעברית)
export function backLink(href, text) {
  return `<a class="back-link" href="${href}">${icon('chevron-right')} ${text}</a>`;
}

// כותרת מסך: כותרת גדולה + שורת משנה
export function screenHead(title, subtitle = '') {
  return `
    <header class="screen-head">
      <h1>${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
    </header>`;
}

// כרטיס למצב ריק: אייקון, כותרת, הסבר, ואולי כפתור
export function emptyCard(iconName, title, text, actionHtml = '') {
  return `
    <div class="card empty-card">
      ${iconChip(iconName, 'muted')}
      <div class="card-title">${title}</div>
      <div class="label">${text}</div>
      ${actionHtml}
    </div>`;
}

export const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// "17.10"
export function shortDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

// "שבת 17.10.2026"
export function longDate(iso) {
  const d = new Date(iso);
  return `${DAY_NAMES[d.getDay()]} ${shortDate(iso)}.${d.getFullYear()}`;
}

// "3 תרגילים" / "תרגיל אחד"
export function countLabel(n, one, many) {
  return n === 1 ? one : `${n} ${many}`;
}

// ===== בורר מספרים: + [ערך] − =====
// field = איזה ערך הוא משנה, step = בכמה כל לחיצה, min = הערך המינימלי
export function stepper({ field, value, step = 1, min = 0, decimal = false, label = '' }) {
  return `
    <div class="stepper" data-field="${field}" data-step="${step}" data-min="${min}">
      ${label ? `<span class="stepper-label">${label}</span>` : ''}
      <div class="stepper-row">
        <button type="button" class="stepper-btn" data-dir="1" aria-label="הוסף">${icon('plus')}</button>
        <input class="stepper-input" type="text" inputmode="${decimal ? 'decimal' : 'numeric'}"
               value="${fmtNum(value)}" aria-label="${label || field}">
        <button type="button" class="stepper-btn" data-dir="-1" aria-label="הפחת">${icon('minus')}</button>
      </div>
    </div>`;
}

// מחבר את כל הבוררים שבתוך root.
// בכל שינוי נקראת onChange(stepperElement, newValue)
export function bindSteppers(root, onChange) {
  const read = (stepperEl) => {
    const input = stepperEl.querySelector('.stepper-input');
    const min = Number(stepperEl.dataset.min);
    const value = parseFloat(input.value.replace(',', '.'));
    return Number.isFinite(value) ? Math.max(min, value) : min;
  };

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.stepper-btn');
    if (!btn) return;
    const stepperEl = btn.closest('.stepper');
    const step = Number(stepperEl.dataset.step);
    const min = Number(stepperEl.dataset.min);
    const value = Math.max(min, read(stepperEl) + step * Number(btn.dataset.dir));
    stepperEl.querySelector('.stepper-input').value = fmtNum(value);
    onChange(stepperEl, Number(fmtNum(value)));
  });

  root.addEventListener('input', (e) => {
    if (!e.target.classList.contains('stepper-input')) return;
    const stepperEl = e.target.closest('.stepper');
    onChange(stepperEl, read(stepperEl));
  });

  // כשנכנסים לשדה - כל הטקסט מסומן, כדי שהקלדה תחליף אותו מיד
  root.addEventListener('focusin', (e) => {
    if (!e.target.classList.contains('stepper-input')) return;
    setTimeout(() => e.target.setSelectionRange(0, e.target.value.length));
  });

  // כשיוצאים מהשדה - מסדרים את התצוגה (למשל שדה ריק → 0)
  root.addEventListener('focusout', (e) => {
    if (!e.target.classList.contains('stepper-input')) return;
    e.target.value = fmtNum(read(e.target.closest('.stepper')));
  });
}

// הודעה קצרה בתחתית המסך שנעלמת לבד
export function toast(message, iconName = 'circle-check') {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon(iconName)}<span>${esc(message)}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// ===== חלון דיאלוג בעיצוב האפליקציה =====
// מחליף את confirm() / alert() של הדפדפן, שנראים כמו אתר ולא כמו אפליקציה.
// מחזיר Promise: true אם לחצו על כפתור האישור, false אם על ביטול.
// דוגמה: if (await confirmDialog({ title: 'למחוק?', danger: true })) { ... }
export function confirmDialog({
  title, message = '', confirmText = 'אישור', cancelText = 'ביטול', danger = false,
  iconName = danger ? 'triangle-alert' : 'info',
}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog" role="dialog" aria-modal="true">
        ${iconChip(iconName, danger ? 'red' : 'green')}
        <div class="dialog-title">${esc(title)}</div>
        ${message ? `<div class="dialog-text">${esc(message)}</div>` : ''}
        <div class="dialog-actions">
          <button class="btn btn-block ${danger ? 'btn-danger-solid' : 'btn-primary'}" data-result="1">${esc(confirmText)}</button>
          ${cancelText ? `<button class="btn btn-ghost btn-block" data-result="0">${esc(cancelText)}</button>` : ''}
        </div>
      </div>`;

    const close = (result) => {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 160);
      resolve(result);
    };
    overlay.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-result]');
      if (btn) close(btn.dataset.result === '1');
      else if (e.target === overlay && cancelText) close(false); // לחיצה על הרקע = ביטול
    });

    document.activeElement?.blur(); // סוגר את המקלדת אם הייתה פתוחה
    document.body.appendChild(overlay);
  });
}

// הודעה עם כפתור אחד
export function alertDialog(title, message = '') {
  return confirmDialog({ title, message, confirmText: 'הבנתי', cancelText: '' });
}
