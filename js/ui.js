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

// הודעה קצרה בתחתית המסך שנעלמת לבד
export function toast(message) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
