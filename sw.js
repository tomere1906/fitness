// Service Worker: שומר עותק של קבצי האפליקציה בטלפון, כדי שהיא תיפתח מהר ותעבוד גם בלי אינטרנט.
//
// איך זה עובד ("stale-while-revalidate"):
// כל קובץ מוגש מיד מהעותק השמור, ובמקביל מורדת ברקע גרסה חדשה מהאינטרנט (אם יש).
// לכן אחרי עדכון של האפליקציה, הגרסה החדשה תופיע בפתיחה השנייה.

// כשמוסיפים קובץ לרשימה למטה - מעלים את המספר, כדי שהעותק השמור יתחדש
const CACHE = 'fitness-app-v2';

// אתרים חיצוניים שמותר לשמור מהם עותק (הפונט Inter)
const EXTERNAL = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

// הקבצים שנשמרים כבר בפתיחה הראשונה
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/ui.js',
  './js/icons.js',
  './js/storage.js',
  './js/plans.js',
  './js/schedule.js',
  './js/workout.js',
  './js/history.js',
  './js/backup.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

// מוחקים עותקים ישנים (אם פעם נשנה את שם ה-CACHE)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { origin } = new URL(request.url);
  if (request.method !== 'GET' || (origin !== location.origin && !EXTERNAL.includes(origin))) return;

  const cached = caches.match(request, { ignoreSearch: true });
  const fresh = fetch(request)
    .then(async (response) => {
      // "opaque" = תשובה מאתר חיצוני (הפונט). אי אפשר לבדוק אותה, אבל אפשר לשמור
      if (response.ok || response.type === 'opaque') (await caches.open(CACHE)).put(request, response.clone());
      return response;
    })
    .catch(() => null); // אין אינטרנט

  event.waitUntil(fresh);
  event.respondWith(
    cached.then(async (hit) => hit
      || (await fresh)
      // אין עותק ואין אינטרנט: בפתיחת דף - מציגים את האפליקציה; בקובץ אחר - שגיאה רגילה
      || (request.mode === 'navigate' ? caches.match('./index.html') : Response.error())),
  );
});
