// ניווט בין המסכים לפי החלק שאחרי # בכתובת (למשל #/plans)

function placeholder(title, text) {
  return (root) => {
    root.innerHTML = `<h1>${title}</h1><div class="empty">${text}</div>`;
  };
}

// כל מסך: איזו פונקציה מציירת אותו, ואיזו לשונית בסרגל התחתון מודגשת
const routes = {
  today: { render: placeholder('היום', 'כאן יופיע האימון של היום'), tab: 'today' },
  plans: { render: placeholder('תוכניות אימון', 'כאן יופיעו תוכניות האימון'), tab: 'plans' },
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
