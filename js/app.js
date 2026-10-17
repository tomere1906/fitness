// ניווט בין המסכים לפי החלק שאחרי # בכתובת (למשל #/plans)
import { renderPlans, renderPlanEditor } from './plans.js';
import { renderToday } from './schedule.js';
import { renderWorkout } from './workout.js';

function placeholder(title, text) {
  return (root) => {
    root.innerHTML = `<h1>${title}</h1><div class="empty">${text}</div>`;
  };
}

// כל מסך: איזו פונקציה מציירת אותו, ואיזו לשונית בסרגל התחתון מודגשת
const routes = {
  today: { render: renderToday, tab: 'today' },
  workout: { render: renderWorkout, tab: 'today' },
  // #/plans → רשימה, #/plans/<id> → עריכת אימון
  plans: { render: (root, id) => (id ? renderPlanEditor(root, id) : renderPlans(root)), tab: 'plans' },
  history: { render: placeholder('היסטוריה', 'יגיע בשלב 5'), tab: 'history' },
  settings: { render: placeholder('הגדרות', 'גיבוי ושחזור יגיעו בשלב 6'), tab: 'settings' },
};

function router() {
  // "#/plans/abc" → name = "plans", param = "abc"
  const [, name, param] = (location.hash || '#/today').split('/');
  const route = routes[name] || routes.today;

  // מסך חדש בכל פעם, כדי שאירועים של המסך הקודם לא יישארו
  const root = document.createElement('div');
  document.getElementById('app').replaceChildren(root);
  window.scrollTo(0, 0);
  route.render(root, param);

  document.querySelectorAll('.tabbar a').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === route.tab);
  });
}

window.addEventListener('hashchange', router);
router();
