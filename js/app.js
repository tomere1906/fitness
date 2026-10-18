// ניווט בין המסכים לפי החלק שאחרי # בכתובת (למשל #/plans)
import { renderPlans, renderPlanEditor } from './plans.js';
import { renderToday } from './schedule.js';
import { renderWorkout } from './workout.js';
import { renderHistory } from './history.js';
import { renderSettings } from './backup.js';
import { icon } from './ui.js';

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

// ===== סרגל הניווט התחתון =====
const TABS = [
  { tab: 'today', icon: 'calendar-days', label: 'היום' },
  { tab: 'plans', icon: 'dumbbell', label: 'תוכניות' },
  { tab: 'history', icon: 'history', label: 'היסטוריה' },
  { tab: 'settings', icon: 'settings', label: 'הגדרות' },
];
document.querySelector('.tabbar').innerHTML = TABS.map((t) => `
  <a href="#/${t.tab}" data-tab="${t.tab}">${icon(t.icon)}<span>${t.label}</span></a>`).join('');

const topbar = document.getElementById('topbar');
const app = document.getElementById('app');

// כשהתוכן נגלל - מופיע קו דק מתחת לכותרת הקבועה (כמו באייפון)
app.addEventListener('scroll', () => {
  topbar.classList.toggle('scrolled', app.scrollTop > 4);
}, { passive: true });

// באייפון, :active (משוב הלחיצה בכפתורים) עובד רק אם יש מאזין למגע בדף
document.addEventListener('touchstart', () => {}, { passive: true });

// ===== מעבר בין מסכים =====
// "עומק" המסך: היום=1, אימון פעיל=2, תוכניות=1, עריכת תוכנית=2, וכן הלאה.
// נכנסים לעומק → המסך מחליק פנימה כמו באייפון; חוזרים אחורה → מחליק בכיוון ההפוך;
// עוברים לשונית → הופעה רכה (fade)
let previous = null;

function transitionType(route, depth) {
  if (!previous) return '';
  if (previous.tab !== route.tab) return 'fade';
  if (depth > previous.depth) return 'push';
  if (depth < previous.depth) return 'pop';
  return 'fade';
}

function router() {
  // "#/plans/abc" → name = "plans", params = ["abc"]
  const [, name, ...params] = (location.hash || '#/today').split('/');
  const route = routes[name] || routes.today;
  const depth = name === 'workout' ? 2 : 1 + params.length;
  const animation = transitionType(route, depth);
  previous = { tab: route.tab, depth };

  // מסך חדש בכל פעם, כדי שאירועים של המסך הקודם לא יישארו
  const root = document.createElement('div');
  app.replaceChildren(root);
  app.scrollTop = 0;
  route.render(root, ...params);

  // הכותרת של המסך ("חזרה" + כותרת גדולה, ולפעמים עוד רכיב כמו פס התקדמות)
  // עוברת לאזור הקבוע למעלה, שלא נגלל
  const head = document.createElement('div');
  head.className = 'topbar-inner';
  root.querySelectorAll(':scope > .back-link, :scope > .screen-head, :scope > .head-extra').forEach((el) => head.appendChild(el));
  topbar.replaceChildren(head);
  topbar.classList.remove('scrolled');

  if (animation) {
    root.classList.add(`enter-${animation}`);
    head.classList.add(`enter-${animation}`);
  }

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
