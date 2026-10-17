// מסך היסטוריה: רשימת התרגילים, ולכל תרגיל - גרף התקדמות וכל הפעמים שעשית אותו
import { getExerciseHistory } from './storage.js';
import { esc, fmtNum, countLabel, shortDate, longDate } from './ui.js';

export function renderHistory(root, key) {
  if (key) {
    renderExercise(root, decodeURIComponent(key));
    return;
  }

  // התרגיל שעשית לאחרונה - ראשון ברשימה
  const items = getExerciseHistory().sort((a, b) => lastDate(b).localeCompare(lastDate(a)));

  root.innerHTML = `
    <h1>היסטוריה</h1>
    ${items.length
      ? items.map((item) => {
        const usesWeight = hasWeight(item);
        const pr = personalRecord(item, usesWeight);
        return `
          <a class="card history-card" href="#/history/${encodeURIComponent(item.key)}">
            <div>
              <div class="plan-card-title">${esc(item.name)}</div>
              <div class="muted small">
                ${countLabel(item.entries.length, 'אימון אחד', 'אימונים')} · אחרון ${shortDate(lastDate(item))}
              </div>
            </div>
            <div class="history-pr">
              <div class="history-pr-value">${usesWeight ? fmtNum(pr.weight) : pr.reps}</div>
              <div class="muted small">${usesWeight ? 'שיא ק״ג' : 'שיא חזרות'}</div>
            </div>
          </a>`;
      }).join('')
      : `<div class="empty">עוד אין היסטוריה.<br>אחרי שתשמור אימון, התרגילים יופיעו כאן.</div>`}
  `;
}

// ===== תרגיל אחד (#/history/<שם>) =====
function renderExercise(root, key) {
  const item = getExerciseHistory().find((i) => i.key === key);
  if (!item) {
    root.innerHTML = `<div class="empty">התרגיל לא נמצא</div>
      <a class="btn btn-block" href="#/history">חזרה להיסטוריה</a>`;
    return;
  }

  // בתרגיל עם משקל עוקבים אחרי המשקל; בתרגיל בלי משקל (כמו מתח) - אחרי החזרות
  const usesWeight = hasWeight(item);
  const unit = usesWeight ? 'ק״ג' : 'חזרות';
  const points = item.entries.map((e) => {
    const set = bestSet(e.sets, usesWeight);
    return { date: e.date, set, value: usesWeight ? set.weight : set.reps };
  });
  const pr = personalRecord(item, usesWeight);
  const prValue = usesWeight ? pr.weight : pr.reps;
  const change = points[points.length - 1].value - points[0].value;

  root.innerHTML = `
    <a class="back-link" href="#/history">→ היסטוריה</a>
    <h1>${esc(item.name)}</h1>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${fmtNum(prValue)}</div>
        <div class="stat-label">שיא (${unit})</div>
      </div>
      <div class="stat">
        <div class="stat-value">${item.entries.length}</div>
        <div class="stat-label">אימונים</div>
      </div>
      <div class="stat">
        <div class="stat-value" dir="ltr">${change > 0 ? '+' : ''}${fmtNum(change)}</div>
        <div class="stat-label">שינוי מההתחלה</div>
      </div>
    </div>

    ${points.length >= 2
      ? `<div class="card chart-card">
          <div class="chart-title">${usesWeight ? 'המשקל הכבד ביותר בכל אימון' : 'הכי הרבה חזרות בכל אימון'}</div>
          <div class="chart" id="chart"></div>
          <div class="chart-readout" id="readout"></div>
        </div>`
      : `<div class="card muted small">הגרף יופיע אחרי שתעשה את התרגיל לפחות פעמיים.</div>`}

    <h2>כל האימונים</h2>
    ${[...item.entries].reverse().map((e) => `
      <div class="card session">
        <div class="session-date">
          ${longDate(e.date)}
          ${e.sets.includes(pr) ? '<span class="pr-badge">🏆 שיא</span>' : ''}
        </div>
        <div class="set-chips">
          ${e.sets.map((s) => `
            <span class="set-chip">${s.weight ? `<b>${fmtNum(s.weight)}</b> ק״ג × ` : ''}<b>${s.reps}</b>${s.weight ? '' : ' חזרות'}</span>`).join('')}
        </div>
      </div>`).join('')}
  `;

  if (points.length >= 2) drawChart(root.querySelector('#chart'), root.querySelector('#readout'), points, unit);
}

// ===== חישובים =====

function lastDate(item) {
  return item.entries[item.entries.length - 1].date;
}

function hasWeight(item) {
  return item.entries.some((e) => e.sets.some((s) => s.weight > 0));
}

// הסט הטוב ביותר: הכי כבד (ובשוויון - הכי הרבה חזרות)
function bestSet(sets, usesWeight) {
  return sets.reduce((best, s) => {
    if (!usesWeight) return s.reps > best.reps ? s : best;
    if (s.weight > best.weight) return s;
    if (s.weight === best.weight && s.reps > best.reps) return s;
    return best;
  });
}

function personalRecord(item, usesWeight) {
  return bestSet(item.entries.flatMap((e) => e.sets), usesWeight);
}

// ===== גרף התקדמות =====
// קו אחד: הערך הטוב ביותר בכל אימון. לחיצה / גרירה על הגרף מציגה את פרטי האימון.

function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

function drawChart(container, readout, points, unit) {
  const W = container.clientWidth;
  const H = 190;
  const pad = { top: 26, right: 16, bottom: 28, left: 40 };
  const w = W - pad.left - pad.right;
  const h = H - pad.top - pad.bottom;

  // טווח הציר האנכי, עם קצת מרווח מעל ומתחת
  const values = points.map((p) => p.value);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const step = niceStep(Math.max(hi - lo, 1) / 3);
  lo = Math.max(0, Math.floor(lo / step) * step - (lo === hi ? step : 0));
  hi = Math.ceil(hi / step) * step + (Math.ceil(hi / step) * step === hi ? step : 0);

  const x = (i) => pad.left + (i * w) / (points.length - 1);
  const y = (v) => pad.top + ((hi - v) / (hi - lo)) * h;

  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);

  const last = points.length - 1;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  container.innerHTML = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="גרף התקדמות">
      ${ticks.map((v) => `
        <line class="chart-grid" x1="${pad.left}" x2="${W - pad.right}" y1="${y(v)}" y2="${y(v)}"/>
        <text class="chart-axis" x="${pad.left - 8}" y="${y(v)}" text-anchor="end" dominant-baseline="middle">${fmtNum(v)}</text>`).join('')}
      <text class="chart-axis" x="${x(0)}" y="${H - 8}" text-anchor="start">${shortDate(points[0].date)}</text>
      <text class="chart-axis" x="${x(last)}" y="${H - 8}" text-anchor="end">${shortDate(points[last].date)}</text>
      <line class="chart-guide" id="guide" y1="${pad.top}" y2="${pad.top + h}"/>
      <path class="chart-line" d="${line}"/>
      ${points.map((p, i) => `<circle class="chart-dot" data-i="${i}" cx="${x(i)}" cy="${y(p.value)}" r="4"/>`).join('')}
      <text class="chart-label" x="${x(last)}" y="${y(points[last].value) - 12}" text-anchor="end">${fmtNum(points[last].value)}</text>
    </svg>`;

  const svg = container.querySelector('svg');
  const guide = svg.querySelector('#guide');

  function select(i) {
    const p = points[i];
    svg.querySelectorAll('.chart-dot').forEach((dot) => dot.setAttribute('r', Number(dot.dataset.i) === i ? 6 : 4));
    guide.setAttribute('x1', x(i));
    guide.setAttribute('x2', x(i));
    const detail = p.set.weight ? `${fmtNum(p.set.weight)} ק״ג × ${p.set.reps} חזרות` : `${p.set.reps} חזרות`;
    readout.innerHTML = `<span class="muted">${longDate(p.date)}:</span> <b>${detail}</b>`;
  }

  // הנקודה הקרובה ביותר למקום שבו נגעת
  function onPointer(e) {
    const px = e.clientX - svg.getBoundingClientRect().left;
    const i = Math.round(((px - pad.left) / w) * last);
    select(Math.min(last, Math.max(0, i)));
  }
  svg.addEventListener('pointerdown', onPointer);
  svg.addEventListener('pointermove', onPointer);

  select(last);
}
