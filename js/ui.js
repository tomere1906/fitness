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

// ===== אייקונים (קווים דקים, בצבע הטקסט שסביבם) =====
const ICONS = {
  dumbbell: '<path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/>',
  flame: '<path d="M12 3c.8 3.2 5 5.4 5 10a5 5 0 0 1-10 0c0-2.1 1-3.6 2.2-4.6.1 1.6.8 2.7 1.9 3.1C11 8.6 11 6 12 3z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  pencil: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="M15 6l-6 6 6 6"/>', // מצביע שמאלה = "קדימה" בעברית
  back: '<path d="M9 6l6 6-6 6"/>',
  chart: '<path d="M4 19V5M4 19h16"/><path d="M8 15l4-4 3 3 5-6"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.01"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
};

export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

// אייקון בתוך עיגול רך. color: green / cyan / orange / red / muted
export function iconChip(name, color = 'green') {
  return `<span class="icon-chip chip-${color}">${icon(name)}</span>`;
}

// קישור "חזרה" בראש מסך פנימי
export function backLink(href, text) {
  return `<a class="back-link" href="${href}">${icon('back')} ${text}</a>`;
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
        <button type="button" class="stepper-btn" data-dir="1" aria-label="הוסף">+</button>
        <input class="stepper-input" type="text" inputmode="${decimal ? 'decimal' : 'numeric'}"
               value="${fmtNum(value)}" aria-label="${label || field}">
        <button type="button" class="stepper-btn" data-dir="-1" aria-label="הפחת">−</button>
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
export function toast(message) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
