'use strict';
/* Odd One Out: vanilla JS, no dependencies. Puzzle logic is pure and testable in Node. */
const DURATION = 30000, PENALTY = 1000;

const poly = (n, r, rot = -90, inner = 0) => {
  const c = inner ? n * 2 : n, p = [];
  for (let i = 0; i < c; i++) {
    const a = (rot + i * 360 / c) * Math.PI / 180, d = inner && i % 2 ? inner : r;
    p.push((50 + d * Math.cos(a)).toFixed(1) + ',' + (50 + d * Math.sin(a)).toFixed(1));
  }
  return `<polygon points="${p.join(' ')}"/>`;
};
const ring = r => `<path fill-rule="evenodd" d="M50 12a38 38 0 1 0 0 76a38 38 0 1 0 0-76zM50 ${50 - r}a${r} ${r} 0 1 0 0 ${2 * r}a${r} ${r} 0 1 0 0-${2 * r}z"/>`;
const PLUS = '<path d="M38 12h24v26h26v24H62v26H38V62H12V38h26z"/>';
const SHAPES = {
  circle: '<circle cx="50" cy="50" r="38"/>',
  square: '<rect x="14" y="14" width="72" height="72" rx="3"/>',
  roundsq: '<rect x="12" y="12" width="76" height="76" rx="26"/>',
  diamond: poly(4, 47),
  tri: '<polygon points="50,14 90,82 10,82"/>',
  trid: '<polygon points="10,18 90,18 50,86"/>',
  pent: poly(5, 42), hex: poly(6, 42, 0), oct: poly(8, 40, 22.5),
  star5: poly(5, 46, -90, 20), star6: poly(6, 46, -90, 26),
  ring: ring(20), ring2: ring(29),
  plus: PLUS, cross: `<g transform="rotate(45 50 50)">${PLUS}</g>`
};
// [base, different] shape pairs, from obvious to subtle.
const TIERS = [
  [['circle', 'square'], ['circle', 'tri'], ['square', 'tri'], ['star5', 'circle'], ['plus', 'square'], ['ring', 'square'], ['hex', 'plus']],
  [['tri', 'trid'], ['square', 'diamond'], ['plus', 'cross'], ['circle', 'ring'], ['hex', 'circle'], ['pent', 'tri']],
  [['pent', 'hex'], ['star5', 'star6'], ['square', 'roundsq'], ['ring', 'ring2'], ['hex', 'oct']],
  [['oct', 'circle'], ['roundsq', 'circle'], ['hex', 'oct'], ['ring', 'ring2'], ['star6', 'star5'], ['pent', 'hex']]
];

function xmur3(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; };
}
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// Each puzzle has its own seed (date + index), so puzzle N is identical for every player on every device.
const rngFor = (date, n) => mulberry32(xmur3(`ooo|${date}|${n}`)());
// Grid size and shape similarity ramp on different beats (grid at 5 and 10, subtlety at 3, 7 and 12),
// so the player only ever faces one new kind of challenge at a time.
const sizeFor = n => n < 5 ? 3 : n < 10 ? 4 : 5;
const HUES = [350, 18, 38, 150, 178, 215, 265, 305]; // curated, all dark enough for the pale cells
const RANKS = [[0, 'Squinter'], [5, 'Spotter'], [10, 'Sharp eye'], [15, 'Hawk'], [20, 'Odd oracle'], [26, 'Pattern breaker']];
const rankFor = n => { let i = 0; RANKS.forEach((r, j) => { if (n >= r[0]) i = j; }); return { i, title: RANKS[i][1], next: RANKS[i + 1] ? { title: RANKS[i + 1][1], at: RANKS[i + 1][0] } : null }; };
const validDate = s => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
};
const isPlayable = (s, today) => validDate(s) && s <= today;
function makePuzzle(date, n) {
  const r = rngFor(date, n), size = sizeFor(n);
  let t = n < 3 ? 0 : n < 7 ? 1 : n < 12 ? 2 : 3;
  if (t > 0 && r() < 0.25) t--;
  const list = TIERS[t], pair = list[Math.floor(r() * list.length)], sw = r() < 0.5 ? 1 : 0;
  return { size, odd: Math.floor(r() * size * size), base: pair[sw], diff: pair[1 - sw], hue: HUES[Math.floor(r() * HUES.length)] };
}
const svg = name => `<svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" focusable="false">${SHAPES[name]}</svg>`;

if (typeof module !== 'undefined') module.exports = { makePuzzle, validDate, isPlayable, sizeFor, rankFor, SHAPES, TIERS, HUES };

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const board = $('board'), stage = $('stage');
  const kick = (el, c) => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Storage: every access is guarded; values are validated and mirrored in memory in case localStorage is blocked.
  const mem = new Map();
  const num = v => { const n = parseInt(v, 10); return n > 0 && n < 1e6 ? n : 0; };
  const bestOf = k => { let a = 0; try { a = num(localStorage.getItem('ooo.v1.' + k)); } catch { /* blocked */ } return Math.max(a, num(mem.get(k))); };
  const saveBest = (k, v) => { mem.set(k, v); try { localStorage.setItem('ooo.v1.' + k, String(v)); } catch { /* blocked */ } };
  const meta = { mute: false, last: '', days: 0 };
  try { Object.assign(meta, JSON.parse(localStorage.getItem('ooo.v1.meta')) || {}); } catch { /* blocked or corrupt */ }
  meta.mute = meta.mute === true; meta.days = Math.max(0, Math.min(9999, meta.days | 0));
  if (!validDate(meta.last)) { meta.last = ''; meta.days = 0; }
  const saveMeta = () => { try { localStorage.setItem('ooo.v1.meta', JSON.stringify(meta)); } catch { /* blocked */ } };

  // Sound: synthesized with WebAudio (no files). The context is created on the first tap, as browsers require.
  let ac = null;
  const wake = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch { ac = null; } };
  const tone = (f, at = 0, dur = .12, type = 'sine', vol = .11) => {
    if (meta.mute || !ac) return;
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + .02);
  };
  const PENTA = [0, 2, 4, 7, 9];
  const sfx = {
    ok: n => tone(392 * 2 ** ((PENTA[(n - 1) % 5] + 12 * Math.min(1, Math.floor((n - 1) / 5))) / 12), 0, .12, 'triangle'), // pitch climbs with the streak
    no: () => { tone(160, 0, .16, 'sawtooth', .08); tone(110, .07, .2, 'sawtooth', .08); },
    up: () => [523, 659, 784].forEach((f, i) => tone(f, i * .07, .14, 'triangle')),
    tick: () => tone(880, 0, .05, 'square', .04),
    end: () => { tone(392, 0, .18, 'triangle'); tone(294, .16, .3, 'triangle'); },
    best: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .1, .22, 'triangle'))
  };
  const paintMute = () => { $('mute').classList.toggle('off', meta.mute); $('mute').setAttribute('aria-label', meta.mute ? 'Unmute sound' : 'Mute sound'); };
  $('mute').addEventListener('click', () => { meta.mute = !meta.mute; saveMeta(); paintMute(); if (!meta.mute) { wake(); sfx.ok(1); } });

  // Challenge date (UTC) and optional friend score to beat (?s=).
  const today = () => new Date().toISOString().slice(0, 10);
  const yesterday = () => new Date(Date.parse(today() + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
  let date = today(), notice = '', target = 0;
  const params = new URLSearchParams(location.search), q = params.get('d');
  if (q !== null) {
    if (isPlayable(q, today())) { date = q; const s = params.get('s'); if (/^\d{1,3}$/.test(s || '')) target = +s; }
    else notice = validDate(q) ? 'That challenge hasn’t started yet, so this is today’s challenge.' : 'That challenge link has an invalid date, so this is today’s challenge.';
  }
  const label = new Date(date + 'T00:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
  const untilNext = () => { const n = new Date(), ms = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1) - n.getTime(); return `${Math.floor(ms / 36e5)}h ${Math.floor(ms % 36e5 / 6e4)}m`; };

  let mode = 'daily', freeSeed = '', phase = 'idle', score = 0, streak = 0, top = 0, miss = 0, lastSec = 0, deadline = 0, pz = null, raf = 0;
  const wrong = new Set(), log = [];
  const seed = () => mode === 'daily' ? date : 'free-' + freeSeed;
  const bkey = () => mode === 'daily' ? date : 'free';

  const show = p => { $('intro').hidden = p !== 'idle'; board.hidden = p !== 'play'; $('result').hidden = p !== 'over'; };
  const stats = () => { $('score').textContent = score; $('streak').textContent = streak; $('streakStat').classList.toggle('hot', streak >= 5); };
  const hud = rem => {
    rem = Math.max(0, rem);
    $('time').textContent = (rem / 1000).toFixed(1);
    $('bar').style.transform = `scaleX(${rem / DURATION})`;
    $('timeStat').classList.toggle('low', rem < 6000);
  };
  const fb = (text, kind) => { const e = $('fb'); e.textContent = text; e.className = 'fb ' + kind; kick(e, 'go'); };
  const burst = cell => {
    if (!cell) return;
    const s = stage.getBoundingClientRect(), c = cell.getBoundingClientRect(), b = document.createElement('i');
    b.className = 'burst'; b.style.left = c.left - s.left + c.width / 2 + 'px'; b.style.top = c.top - s.top + c.height / 2 + 'px';
    stage.appendChild(b); setTimeout(() => b.remove(), 500);
  };

  function home() {
    const daily = mode === 'daily', best = bestOf(bkey());
    $('dateLabel').textContent = daily ? 'Daily challenge, ' + label : 'Free play';
    $('intro').querySelector('.fine').textContent = daily ? 'Everyone gets the same puzzles each UTC day.' : 'Random puzzles every run. Scores here are kept separate from the daily.';
    $('bestLine').textContent = best ? `Your best${daily ? ' for this day' : ''}: ${best}` : 'Set your first score.';
    $('notice').hidden = !notice; $('notice').textContent = notice;
    $('target').hidden = !(daily && target); $('target').textContent = `A friend scored ${target}. Can you beat it?`;
    const live = meta.last === today() || meta.last === yesterday();
    $('dayLine').hidden = !(daily && date === today());
    $('dayLine').textContent = live && meta.days > 0 ? `${meta.days}-day streak. ${meta.last === today() ? 'See you tomorrow for new puzzles.' : 'Play today to keep it going.'}` : 'Play every day to build a streak.';
    $('todayLink').hidden = !(daily && date !== today());
    paintMode(); paintMute();
    const o = Math.floor(Math.random() * 9);
    $('demo').style.setProperty('--c', `hsl(${HUES[Math.floor(Math.random() * HUES.length)]} 80% 36%)`);
    $('demo').innerHTML = Array.from({ length: 9 }, (_, i) => `<button type="button" class="cell mini" data-odd="${i === o ? 1 : 0}" aria-label="Practice cell ${i + 1}">${svg(i === o ? 'square' : 'circle')}</button>`).join('');
    $('demoMsg').textContent = 'Try it: tap the odd one.';
    hud(DURATION); score = 0; streak = 0; stats(); show('idle');
  }
  const paintMode = () => { const t = mode === 'daily' ? 'Free play: random puzzles' : 'Back to the daily challenge'; $('modeBtn1').textContent = t; $('modeBtn2').textContent = t; };
  const toggleMode = () => { mode = mode === 'daily' ? 'free' : 'daily'; cancelAnimationFrame(raf); phase = 'idle'; home(); $('start').focus(); };

  $('demo').addEventListener('click', e => {
    const c = e.target.closest('.mini'); if (!c) return;
    wake();
    if (c.dataset.odd === '1') { $('demoMsg').textContent = 'That’s the idea. Now play for real.'; c.classList.add('hit'); sfx.ok(1); }
    else { $('demoMsg').textContent = 'Not that one. Look for the shape that’s different.'; sfx.no(); }
  });

  function render() {
    const act = board.contains(document.activeElement) ? [...board.children].indexOf(document.activeElement) : -1;
    pz = makePuzzle(seed(), score); wrong.clear();
    board.style.setProperty('--n', pz.size);
    board.style.setProperty('--c', `hsl(${pz.hue} 80% 36%)`);
    board.innerHTML = Array.from({ length: pz.size ** 2 }, (_, i) =>
      `<button type="button" class="cell" data-i="${i}" aria-label="Row ${Math.floor(i / pz.size) + 1}, column ${i % pz.size + 1}">${svg(i === pz.odd ? pz.diff : pz.base)}</button>`).join('');
    if (act >= 0) board.children[Math.min(act, pz.size ** 2 - 1)].focus({ preventScroll: true });
  }

  function loop() {
    if (phase !== 'play') return;
    const rem = deadline - performance.now(); // absolute deadline: frame timing cannot cause drift
    if (rem <= 0) { hud(0); end(); return; }
    const sec = Math.ceil(rem / 1000);
    if (sec <= 3 && sec !== lastSec) { lastSec = sec; sfx.tick(); }
    hud(rem); raf = requestAnimationFrame(loop);
  }

  function start() {
    cancelAnimationFrame(raf); wake();
    if (mode === 'free') freeSeed = Math.random().toString(36).slice(2, 8);
    phase = 'play'; score = 0; streak = 0; top = 0; miss = 0; lastSec = 0; log.length = 0;
    deadline = performance.now() + DURATION;
    $('fb').textContent = ''; $('note').textContent = ''; $('manualWrap').hidden = true;
    show('play'); render(); stats(); hud(DURATION);
    board.children[0].focus({ preventScroll: true });
    raf = requestAnimationFrame(loop);
  }

  function pick(i) {
    if (phase !== 'play' || wrong.has(i)) return;
    if (i === pz.odd) {
      const before = rankFor(score).i;
      score++; streak++; top = Math.max(top, streak); log.push(1);
      burst(board.children[i]); kick(board, 'ok');
      if (rankFor(score).i > before) { fb(rankFor(score).title + '!', 'ok big'); sfx.up(); }
      else if (streak % 5 === 0) { fb(streak + ' in a row', 'ok big'); sfx.up(); }
      else { fb('+1', 'ok'); sfx.ok(streak); }
      render();
    } else {
      streak = 0; miss++; log.push(0); deadline -= PENALTY; wrong.add(i);
      const c = board.children[i]; c.classList.add('bad'); c.setAttribute('aria-disabled', 'true');
      fb('−1 second', 'no'); kick(board, 'no'); kick($('timeStat'), 'hit'); sfx.no();
      if (navigator.vibrate) navigator.vibrate(60);
    }
    stats();
    const rem = deadline - performance.now();
    if (rem <= 0) end(); else hud(rem);
  }

  function countUp(el, to, done) {
    if (reduced() || to < 2) { el.textContent = to; done(); return; }
    const t0 = performance.now(), dur = Math.min(900, to * 50);
    const f = () => { const k = Math.min(1, Math.max(0, (performance.now() - t0) / dur)); el.textContent = Math.round(to * k * (2 - k)); if (k < 1) requestAnimationFrame(f); else done(); };
    requestAnimationFrame(f);
  }

  function end() {
    if (phase !== 'play') return;
    phase = 'over'; cancelAnimationFrame(raf);
    const daily = mode === 'daily', k = bkey(), prev = bestOf(k), isBest = score > prev, rank = rankFor(score);
    if (isBest) saveBest(k, score);
    if (daily && date === today() && meta.last !== today()) { meta.days = meta.last === yesterday() ? meta.days + 1 : 1; meta.last = today(); saveMeta(); }
    $('rTitle').textContent = rank.title;
    $('rBest').textContent = Math.max(prev, score); $('rStreak').textContent = top;
    $('rAcc').textContent = score + miss ? Math.round(100 * score / (score + miss)) + '%' : '-';
    $('rBadge').hidden = !isBest; $('rBadge').textContent = prev ? 'New personal best!' : 'First score on the board!';
    let msg = score === 0 ? 'Look for the shape that breaks the pattern.' : isBest ? '' : score === prev ? 'You matched your best.' : `${prev - score} short of your best. Go again.`;
    if (daily && target && score > 0) msg = score > target ? `You beat your friend’s ${target}!` : score === target ? `You tied your friend’s ${target}.` : `${target - score} short of your friend’s ${target}.`;
    $('rMsg').textContent = msg; $('rMsg').hidden = !msg;
    $('rNext').textContent = rank.next ? `${rank.next.at - score} more for ${rank.next.title}` : 'Top rank reached.';
    $('rWait').hidden = !(daily && date === today()); $('rWait').textContent = `New daily puzzles in ${untilNext()}`;
    $('share').hidden = !daily; paintMode();
    $('result').classList.toggle('best', isBest);
    $('rScore').textContent = 0; show('over'); $('again').focus();
    countUp($('rScore'), score, () => { if (isBest) kick($('rBadge'), 'go'); });
    (isBest ? sfx.best : sfx.end)();
  }

  const strip = () => { const l = log.slice(-30).map(x => x ? '🟩' : '🟥'), r = []; for (let i = 0; i < l.length; i += 10) r.push(l.slice(i, i + 10).join('')); return r.join('\n'); };
  const link = () => { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('d', date); if (score > 0) u.searchParams.set('s', score); return u.href; };
  async function share() {
    const text = `Odd One Out ${date}\n${rankFor(score).title}: ${score} spotted in 30 seconds, top streak ${top}\n${strip()}\nSame puzzles for everyone. Beat me:`;
    const url = link(), full = text + '\n' + url;
    try { if (navigator.share) { await navigator.share({ title: 'Odd One Out', text, url }); $('note').textContent = 'Shared.'; return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(full); $('note').textContent = 'Copied to your clipboard.'; return; } catch { /* fall through */ }
    const ta = $('manual'); ta.value = full; $('manualWrap').hidden = false; ta.focus(); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    $('note').textContent = ok ? 'Copied to your clipboard.' : 'Sharing isn’t available here. Copy the message above.';
  }

  // Pointer taps respond on press (lower latency); keyboard activation arrives as a click with detail 0.
  board.addEventListener('pointerdown', e => { const c = e.target.closest('.cell'); if (c && (e.pointerType !== 'mouse' || e.button === 0)) { e.preventDefault(); pick(+c.dataset.i); } });
  board.addEventListener('click', e => { if (e.detail === 0) { const c = e.target.closest('.cell'); if (c) pick(+c.dataset.i); } });
  board.addEventListener('contextmenu', e => e.preventDefault());
  board.addEventListener('keydown', e => {
    const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    if (!d) return;
    const n = pz.size, i = [...board.children].indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const r = Math.min(n - 1, Math.max(0, Math.floor(i / n) + d[0])), c = Math.min(n - 1, Math.max(0, i % n + d[1]));
    board.children[r * n + c].focus();
  });
  $('start').addEventListener('click', start);
  $('again').addEventListener('click', start);
  $('share').addEventListener('click', share);
  $('modeBtn1').addEventListener('click', toggleMode);
  $('modeBtn2').addEventListener('click', toggleMode);
  home();
}
