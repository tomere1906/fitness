// שמירה וטעינה של כל הנתונים בדפדפן (localStorage).
// זה המקום היחיד באפליקציה שנוגע ישירות באחסון.

import { alertDialog } from './ui.js';

const KEY = 'fitness-app:data';

function emptyData() {
  return {
    version: 1,
    plans: [],          // תוכניות אימון
    // לוח שבועי: לכל יום (0 = ראשון ... 6 = שבת) מזהה האימון, או null = מנוחה
    schedule: [null, null, null, null, null, null, null],
    sessions: [],       // אימונים שבוצעו ונשמרו (מהישן לחדש)
    activeWorkout: null, // אימון שנמצא כרגע בתהליך
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyData(), ...JSON.parse(raw) };
  } catch (err) {
    console.error('טעינת הנתונים נכשלה', err);
  }
  return emptyData();
}

const data = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (err) {
    console.error(err);
    alertDialog('השמירה נכשלה', 'ייתכן שהאחסון בדפדפן מלא.');
  }
}

// מזהה ייחודי קצר, למשל "lq3k2m8x4f"
export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ===== תוכניות אימון =====
// תוכנית: { id, name, exercises: [{ id, name, sets, reps, weight }] }

export function getPlans() {
  return data.plans;
}

export function getPlan(id) {
  return data.plans.find((p) => p.id === id);
}

export function createPlan() {
  const plan = { id: newId(), name: '', exercises: [] };
  data.plans.push(plan);
  save();
  return plan;
}

export function deletePlan(id) {
  data.plans = data.plans.filter((p) => p.id !== id);
  // אימון שנמחק יוצא גם מהלוח השבועי
  data.schedule = data.schedule.map((planId) => (planId === id ? null : planId));
  save();
}

export function planName(plan) {
  return plan?.name.trim() || 'אימון ללא שם';
}

// ===== לוח שבועי =====

export function getSchedule() {
  return data.schedule;
}

export function setScheduleDay(day, planId) {
  data.schedule[day] = planId || null;
  save();
}

// ===== אימון פעיל =====
// { planId, planName, startedAt,
//   exercises: [{ name, planned: { sets, reps, weight }, previous, sets: [{ weight, reps, done }] }] }

export function getActiveWorkout() {
  return data.activeWorkout;
}

export function setActiveWorkout(workout) {
  data.activeWorkout = workout;
  save();
}

// ===== אימונים שבוצעו =====
// { id, planId, planName, date, exercises: [{ name, sets: [{ weight, reps }] }] }

export function getSessions() {
  return data.sessions;
}

export function addSession(session) {
  data.sessions.push(session);
  save();
}

// התרגיל מזוהה לפי השם, בלי הבדל בין רווחים או אותיות גדולות/קטנות
export function exerciseKey(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// כל האימונים שבוצעו, מסודרים לפי תאריך (מהישן לחדש)
export function getSessionsByDate() {
  return [...data.sessions].sort((a, b) => a.date.localeCompare(b.date));
}

// הפעם האחרונה שעשית תרגיל מסוים: { date, sets } או null.
// קודם מחפשים באותו סוג אימון, ואם אין - בכל אימון אחר
export function getLastPerformance(name, planId) {
  const key = exerciseKey(name);
  if (!key) return null;
  const sessions = getSessionsByDate().reverse();
  const find = (list) => {
    for (const s of list) {
      const ex = s.exercises.find((e) => exerciseKey(e.name) === key);
      if (ex && ex.sets.length) return { date: s.date, sets: ex.sets };
    }
    return null;
  };
  return find(sessions.filter((s) => s.planId === planId)) || find(sessions);
}

// ===== גיבוי =====

// עותק של כל הנתונים, לשמירה בקובץ
export function exportData() {
  return JSON.parse(JSON.stringify(data));
}

// בודק שהנתונים מקובץ הגיבוי במבנה הנכון. זורק שגיאה אם לא
export function validateBackup(imported) {
  const valid = imported
    && Array.isArray(imported.plans)
    && Array.isArray(imported.sessions)
    && Array.isArray(imported.schedule) && imported.schedule.length === 7;
  if (!valid) throw new Error('הקובץ לא נראה כמו גיבוי של האפליקציה');
}

// מחליף את כל הנתונים בנתונים מקובץ גיבוי
export function importData(imported) {
  validateBackup(imported);
  for (const key of Object.keys(data)) delete data[key];
  Object.assign(data, emptyData(), imported);
  save();
}

// מתי עשית גיבוי בפעם האחרונה (נשמר בנפרד, כי זה לא חלק מהנתונים עצמם)
const BACKUP_KEY = 'fitness-app:lastBackup';

export function getLastBackup() {
  return localStorage.getItem(BACKUP_KEY);
}

export function setLastBackup(iso) {
  localStorage.setItem(BACKUP_KEY, iso);
}
