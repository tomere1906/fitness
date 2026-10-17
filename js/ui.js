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
