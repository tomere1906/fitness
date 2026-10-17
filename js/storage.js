// שמירה וטעינה של כל הנתונים בדפדפן (localStorage).
// זה המקום היחיד באפליקציה שנוגע ישירות באחסון.

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
    alert('השמירה נכשלה. ייתכן שהאחסון בדפדפן מלא.');
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

// כל התרגילים שאי פעם ביצעת, כל אחד עם רשימת הפעמים (מהישן לחדש):
// [{ key, name, entries: [{ date, sets }] }]
export function getExerciseHistory() {
  const byKey = new Map();
  const sessions = [...data.sessions].sort((a, b) => a.date.localeCompare(b.date));
  for (const session of sessions) {
    for (const ex of session.exercises) {
      const key = exerciseKey(ex.name);
      if (!key || !ex.sets.length) continue;
      if (!byKey.has(key)) byKey.set(key, { key, name: ex.name, entries: [] });
      const item = byKey.get(key);
      item.name = ex.name; // מציגים את השם כפי שנכתב בפעם האחרונה
      item.entries.push({ date: session.date, sets: ex.sets });
    }
  }
  return [...byKey.values()];
}

// הפעם האחרונה שעשית תרגיל מסוים: { date, sets } או null
export function getLastPerformance(name) {
  const key = exerciseKey(name);
  if (!key) return null;
  for (let i = data.sessions.length - 1; i >= 0; i--) {
    const ex = data.sessions[i].exercises.find((e) => exerciseKey(e.name) === key);
    if (ex && ex.sets.length) return { date: data.sessions[i].date, sets: ex.sets };
  }
  return null;
}
