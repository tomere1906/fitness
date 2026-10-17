// שמירה וטעינה של כל הנתונים בדפדפן (localStorage).
// זה המקום היחיד באפליקציה שנוגע ישירות באחסון.

const KEY = 'fitness-app:data';

function emptyData() {
  return {
    version: 1,
    plans: [],          // תוכניות אימון
    // לוח שבועי: לכל יום (0 = ראשון ... 6 = שבת) מזהה האימון, או null = מנוחה
    schedule: [null, null, null, null, null, null, null],
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
