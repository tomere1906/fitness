// Service Worker: שומר עותק של קבצי האפליקציה בטלפון, כדי שהיא תעבוד גם בלי אינטרנט.
//
// איך זה עובד ("network-first"):
// - יש אינטרנט: מביאים את הגרסה הכי חדשה מהאתר (ושומרים עותק שלה).
// - האינטרנט איטי: מחכים עד 3 שניות, ואז מציגים את העותק השמור.
// - אין אינטרנט: מציגים את העותק השמור.
// כך עדכון מגיע כבר בפתיחה הבאה, ובחדר כושר בלי קליטה הכול עדיין עובד.

// גרסת האפליקציה. בכל עדכון מעלים אותה - גם כאן וגם ב-js/version.js
const VERSION = '1.7';
const CACHE = `fitness-app-${VERSION}`;

// אתרים חיצוניים שמותר לשמור מהם עותק (הפונט Inter)
const EXTERNAL = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

// כמה זמן מחכים לאינטרנט לפני שמציגים את העותק השמור
const NETWORK_TIMEOUT = 3000;

// הקבצים שנשמרים כבר בפתיחה הראשונה
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/version.js',
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
  // cache: 'reload' = להביא מהאתר עצמו, לא מעותק ישן שהדפדפן שמר
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))),
  );
  self.skipWaiting(); // הגרסה החדשה נכנסת לפעולה מיד, בלי לחכות
});

// מוחקים עותקים של גרסאות קודמות
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { origin } = new URL(request.url);
  if (request.method !== 'GET') return;

  if (origin === location.origin) {
    event.respondWith(networkFirst(event));
  } else if (EXTERNAL.includes(origin)) {
    event.respondWith(cacheFirst(request)); // פונט לא משתנה - מספיק להביא פעם אחת
  }
});

async function networkFirst(event) {
  const { request } = event;
  const url = request.url;
  const cache = await caches.open(CACHE);

  // cache: 'no-cache' = לשאול את האתר אם יש גרסה חדשה, גם אם הדפדפן חושב שהעותק שלו עדיין טוב
  const network = fetch(url, { cache: 'no-cache' }).then((response) => {
    if (response.ok) cache.put(url, response.clone());
    return response;
  });
  // גם אם הצגנו את העותק השמור בגלל איטיות - ההורדה ממשיכה ברקע ותישמר לפעם הבאה
  event.waitUntil(network.catch(() => {}));

  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT));
    return await Promise.race([network, timeout]);
  } catch {
    const hit = await cache.match(url, { ignoreSearch: true });
    if (hit) return hit;
    if (request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  try {
    const response = await fetch(request);
    // "opaque" = תשובה מאתר חיצוני. אי אפשר לבדוק אותה, אבל אפשר לשמור
    if (response.ok || response.type === 'opaque') (await caches.open(CACHE)).put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}
