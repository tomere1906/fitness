// מסך הגדרות: גיבוי (ייצוא לקובץ) ושחזור (ייבוא מקובץ)
import { exportData, importData, validateBackup, getLastBackup, setLastBackup } from './storage.js';
import { countLabel, longDate, toast } from './ui.js';

// אחרי כמה ימים בלי גיבוי מציגים תזכורת
const REMIND_AFTER_DAYS = 7;

export function renderSettings(root) {
  const d = exportData();
  const last = getLastBackup();
  const days = last ? Math.floor((Date.now() - new Date(last)) / 86400000) : null;
  const needsBackup = d.sessions.length > 0 && (days === null || days >= REMIND_AFTER_DAYS);

  root.innerHTML = `
    <h1>הגדרות</h1>

    <h2>גיבוי ושחזור</h2>
    <div class="card">
      <div class="plan-card-title">
        ${countLabel(d.plans.length, 'תוכנית אחת', 'תוכניות')} ·
        ${countLabel(d.sessions.length, 'אימון שמור אחד', 'אימונים שמורים')}
      </div>
      <div class="muted small">
        גיבוי אחרון: ${last ? `${longDate(last)} (${daysLabel(days)})` : 'עוד לא גיבית'}
      </div>
      ${needsBackup ? `<div class="trend-alert small">⚠️ כדאי לגבות עכשיו</div>` : ''}

      <div class="backup-actions">
        <button class="btn btn-primary btn-lg btn-block" data-action="export">ייצוא לקובץ</button>
        <button class="btn btn-block" data-action="import">ייבוא מקובץ</button>
      </div>
      <input type="file" id="import-file" accept=".json,application/json" hidden>
    </div>

    <div class="card muted small backup-help">
      <b>ייצוא</b> יוצר קובץ עם כל הנתונים: תוכניות, לוח שבועי וכל האימונים.
      שמור אותו במקום בטוח, למשל <span class="nowrap">ב-iCloud Drive</span>, או שלח אותו לעצמך.<br><br>
      <b>ייבוא</b> טוען קובץ גיבוי <b>ומחליף</b> את כל הנתונים שיש עכשיו במכשיר הזה.
      כך גם מעבירים נתונים ממכשיר למכשיר.
    </div>
  `;

  const fileInput = root.querySelector('#import-file');

  root.querySelector('[data-action="export"]').addEventListener('click', async () => {
    const saved = await exportBackup(d);
    if (!saved) return;
    setLastBackup(new Date().toISOString());
    toast('הגיבוי נוצר ✓');
    // מציירים את המסך מחדש כדי לעדכן את "גיבוי אחרון"
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // כפתור הייבוא פותח את בחירת הקבצים של המכשיר
  root.querySelector('[data-action="import"]').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = ''; // כדי שאפשר יהיה לבחור שוב את אותו קובץ
    if (!file) return;

    let incoming;
    try {
      const parsed = JSON.parse(await file.text());
      incoming = parsed.data ?? parsed; // הקובץ שלנו: { app, exportedAt, data }
      validateBackup(incoming);
    } catch (err) {
      alert(`הייבוא נכשל: ${err instanceof SyntaxError ? 'הקובץ פגום או שהוא לא קובץ גיבוי' : err.message}`);
      return;
    }

    const summary = `${countLabel(incoming.plans.length, 'תוכנית אחת', 'תוכניות')}, ${countLabel(incoming.sessions.length, 'אימון אחד', 'אימונים')}`;
    if (!confirm(`לייבא את הגיבוי (${summary})?\nכל הנתונים שיש עכשיו במכשיר הזה יוחלפו.`)) return;

    importData(incoming);
    toast('הנתונים שוחזרו ✓');
    location.hash = '#/today';
  });
}

// יוצר את קובץ הגיבוי. בטלפון - פותח את תפריט השיתוף (שמירה בקבצים, AirDrop, וואטסאפ...).
// במחשב - מוריד את הקובץ. מחזיר false אם המשתמש ביטל
async function exportBackup(data) {
  const json = JSON.stringify({ app: 'fitness-app', exportedAt: new Date().toISOString(), data }, null, 2);
  const file = new File([json], `fitness-backup-${dateStamp()}.json`, { type: 'application/json' });

  const isPhone = matchMedia('(pointer: coarse)').matches;
  if (isPhone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false; // המשתמש סגר את תפריט השיתוף
      // שיתוף נכשל מסיבה אחרת - ממשיכים להורדה רגילה
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// "2026-10-17" לפי השעון המקומי
function dateStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysLabel(days) {
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  return `לפני ${days} ימים`;
}
