// ניווט בין המסכים לפי החלק שאחרי # בכתובת (למשל #/plans)
import { renderPlans, renderPlanEditor } from './plans.js';
import { renderToday } from './schedule.js';
import { renderWorkout } from './workout.js';
import { renderHistory } from './history.js';
import { renderSettings } from './backup.js';

// כל מסך: איזו פונקציה מציירת אותו, ואיזו לשונית בסרגל התחתון מודגשת
const routes = {
  today: { render: renderToday, tab: 'today' },
  workout: { render: renderWorkout, tab: 'today' },
  // #/plans → רשימה, #/plans/<id> → עריכת אימון
  plans: { render: (root, id) => (id ? renderPlanEditor(root, id) : renderPlans(root)), tab: 'plans' },
  // #/history → סוגי אימונים, #/history/<אימון> → תאריכים, #/history/<אימון>/<תאריך> → אימון אחד
  history: { render: renderHistory, tab: 'history' },
  settings: { render: renderSettings, tab: 'settings' },
};

function router() {
  // "#/plans/abc" → name = "plans", params = ["abc"]
  const [, name, ...params] = (location.hash || '#/today').split('/');
  const route = routes[name] || routes.today;

  // מסך חדש בכל פעם, כדי שאירועים של המסך הקודם לא יישארו
  const root = document.createElement('div');
  document.getElementById('app').replaceChildren(root);
  window.scrollTo(0, 0);
  route.render(root, ...params);

  document.querySelectorAll('.tabbar a').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === route.tab);
  });
}

window.addEventListener('hashchange', router);
router();

// ===== עבודה בלי אינטרנט (Service Worker) =====
// במחשב בזמן פיתוח (localhost) הוא כבוי, כדי שכל שינוי בקוד יופיע מיד.
// כדי לבדוק אותו בכל זאת במחשב - מוסיפים לכתובת ?pwa (למשל http://127.0.0.1:5500/?pwa)
const isDev = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('pwa');

if ('serviceWorker' in navigator) {
  if (isDev) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  } else {
    navigator.serviceWorker.register('sw.js');
  }
}
