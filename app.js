/* Dani Days — Stage 1 prototype */
(function () {
  'use strict';

  // ---------- API ----------
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  const rawBase = window.__API_BASE__ || '';
  const unresolved = rawBase.startsWith('__PORT_');
  const API = unresolved ? (localHosts.has(location.hostname) ? 'http://localhost:8000' : null) : rawBase;
  const AK = window.__DD_KEY__ || (location.hash.match(/[#&]k=([\w-]+)/) || [])[1] || '';
  const AH = AK ? { 'x-dd-key': AK } : {};

  // ---------- defaults ----------
  const DEFAULT_SETTINGS = {
    windowStart: '08:00', windowEnd: '22:00',
    stepTarget: 10000, stepBonusAt: 15000, lowSteps: 4000,
    dailyCap: -50,
    startWeight: null, goalWeight: null,
    trendTolerance: 0.1,
    maintenanceBand: 1.5,
    stickerPoor: 0, stickerGreat: 75,
    showDanielle: true, petStyle: 'sticker', theme: 'sunflower',
    proteinTarget: 120, waterTarget: 2500,
    pts: {
      boxing: 30, strength: 25, cardio: 20,
      steps: 20, stepsBonus: 10,
      healthy: 10, healthyMax: 3,
      windowBonus: 15, water: 5, complete: 10,
      unhealthy: -10, overate: -20, outside: -15, lowSteps: -20, alcohol: -10,
      kgMilestone: 100, pctMilestone: 500, trendUp: -30, maintainWeek: 50,
      quest: 15, questAll: 10,
      protein: 10, sleepGood: 10, sleepBad: -10, rhrLow: 5
    }
  };

  const ACTIONS = {
    healthy:   { label: 'Healthy meal', group: 'food', good: true },
    unhealthy: { label: 'Unhealthy item', group: 'food', good: false },
    overate:   { label: 'Overate', group: 'food', good: false },
    alcohol:   { label: 'Alcohol (1 drink)', group: 'food', good: false },
    boxing:    { label: 'Boxing 30 min', group: 'ex', good: true },
    strength:  { label: 'Strength session', group: 'ex', good: true },
    cardio:    { label: 'Other cardio 30 min', group: 'ex', good: true },
    water:     { label: 'Water target hit', group: 'daily', good: true, once: true },
    complete:  { label: 'Logged everything', group: 'daily', good: true, once: true }
  };

  const STK = t => [1, 2, 3].map(i => `./stickers/dani/${t}${i}.webp`);
  const STICKERS = {
    poor:  { imgs: STK('poor'),  name: 'Rough day', label: 'Rough day' },
    okay:  { imgs: STK('okay'),  name: 'Solid day', label: 'Solid day' },
    great: { imgs: STK('great'), name: 'Huge day',  label: 'Huge day' }
  };
  Object.values(STICKERS).forEach(t => t.img = t.imgs[0]);
  function stSrc(t, seed) { const a = STICKERS[t].imgs; return a[((seed || 0) % a.length + a.length) % a.length]; }
  function tierOf(n) { const s = state.settings; return n <= s.stickerPoor ? 'poor' : n >= s.stickerGreat ? 'great' : 'okay'; }
  function stickerImg(n, size, extra, ds) { const k = tierOf(n), t = STICKERS[k]; return `<img class="sticker ${extra || ''}" src="${stSrc(k, ds ? dayIndex(ds) : 0)}" alt="Danielle sticker: ${t.label.toLowerCase()}" width="${size}" height="${size}">`; }

  const DANIELLE = [{"img": "./danielle/body/b1.jpg", "fit": "contain"}, {"img": "./danielle/body/b2.jpg", "fit": "contain"}, {"img": "./danielle/body/b3.jpg", "fit": "contain"}, {"img": "./danielle/body/b4.jpg", "fit": "contain"}, {"img": "./danielle/body/b5.jpg"}, {"img": "./danielle/body/b6.jpg"}, {"img": "./danielle/body/b7.jpg"}, {"img": "./danielle/body/b20.jpg"}, {"img": "./danielle/body/b8.jpg"}, {"img": "./danielle/body/b9.jpg", "fit": "contain"}, {"img": "./danielle/body/b21.jpg"}, {"img": "./danielle/body/b10.jpg", "fit": "contain"}, {"img": "./danielle/body/b11.jpg", "fit": "contain"}, {"img": "./danielle/body/b22.jpg"}, {"img": "./danielle/body/b12.jpg"}, {"img": "./danielle/body/b13.jpg"}, {"img": "./danielle/body/b23.jpg"}, {"img": "./danielle/body/b14.jpg"}, {"img": "./danielle/body/b15.jpg", "fit": "contain"}, {"img": "./danielle/body/b24.jpg"}, {"img": "./danielle/body/b16.jpg", "fit": "contain"}, {"img": "./danielle/body/b17.jpg"}, {"img": "./danielle/body/b25.jpg"}, {"img": "./danielle/body/b18.jpg"}, {"img": "./danielle/body/b19.jpg"}, {"img": "./danielle/body/b26.jpg"}];
  function dayIndex(ds) { const d = parseD(ds); return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); }
  // ---------- unlocks: first few free, the rest spread across levels 2–15 (by peak level reached) ----------
  const MAX_UNLOCK_L = 15;
  function assignLv(list, start) { const rest = Math.max(1, list.length - start); list.forEach((x, i) => { x.lv = i < start ? 1 : 2 + Math.floor((i - start) * (MAX_UNLOCK_L - 1) / rest); }); }
  let peakL = 1;
  const unl = list => { const u = list.filter(x => x.lv <= peakL); return u.length ? u : list.slice(0, 1); };
  const DM_PRE = {};
  function dmPrefetch() { if (DM_PRE.done) return; DM_PRE.done = true; setTimeout(() => unl(DANIELLE).forEach(p => { const im = new Image(); im.src = p.img + (p.fit ? '?v=3' : ''); DM_PRE[p.img] = im; }), 300); }
  function dmPick(ds, offset) { const L = unl(DANIELLE), n = L.length; return L[((dayIndex(ds) + (offset || 0)) % n + n) % n]; }
  // GIF clips (animated webp from Tenor; images autoplay and never go fullscreen on iOS). type: c=celebrate, h=heart, t=thumbs up, s=smile
  const DANI_GIFS = [["t", "g00"], ["s", "g01"], ["t", "g02"], ["h", "g03"], ["h", "g04"], ["s", "g05"], ["c", "g22"], ["s", "g06"], ["c", "g23"], ["c", "g07"], ["h", "g24"], ["c", "g08"], ["h", "g09"], ["h", "g26"], ["h", "g10"], ["h", "g27"], ["c", "g11"], ["h", "g28"], ["s", "g12"], ["h", "g29"], ["s", "g13"], ["t", "g30"], ["c", "g14"], ["s", "g31"], ["c", "g15"], ["s", "g32"], ["t", "g16"], ["s", "g33"], ["s", "g17"], ["s", "g34"], ["h", "g18"], ["s", "g35"], ["s", "g19"], ["s", "g36"], ["s", "g20"], ["s", "g37"], ["s", "g21"], ["s", "g38"], ["s", "g40"]].map(([t, n]) => ({ t, vid: './danielle/gifs/' + n + '.webp', poster: './danielle/gifs/' + n + '.jpg' }));
  assignLv(DANIELLE, 5); assignLv(DANI_GIFS, 5);
  function gifPick(ds, offset) { const L = unl(DANI_GIFS), n = L.length; return L[((dayIndex(ds) + (offset || 0)) % n + n) % n]; }
  function gifRand(types) { let pool = unl(DANI_GIFS).filter(g => types.includes(g.t)); if (!pool.length) pool = DANI_GIFS.filter(g => types.includes(g.t)); return pool[Math.floor(Math.random() * pool.length)]; }
  function gifVid(g, cls) { return `<img class="${cls || ''}" src="${g.vid}" alt="Danielle Marsh GIF" draggable="false">`; }
  const FACES = Array.from({length: 26}, (_, i) => ({face: `./danielle/p${i + 1}-face.jpg`}));
  function dmFace(seed) { if (!state.settings.showDanielle) return ''; const p = FACES[((dayIndex(todayStr()) + seed) % FACES.length + FACES.length) % FACES.length]; return `<img class="dm-face" src="${p.face}" alt="Danielle Marsh" width="56" height="56">`; }

  // ---------- quests + combo (count from BONUS_FROM onward) ----------
  const BONUS_FROM = '2026-11-04';
  const QUESTS = [
    { k: 'meals2', sheet: 'feed', label: () => 'Log 2 healthy meals', done: (d, f) => f.healthy >= 2, prog: (d, f) => ({ pct: Math.min(1, f.healthy / 2), txt: Math.min(f.healthy, 2) + ' / 2 meals' }) },
    { k: 'weigh', sheet: 'weight', label: () => 'Log a weigh-in', done: d => !!d && d.weight != null, prog: d => ({ txt: d && d.weight != null ? d.weight + ' kg logged' : 'Not yet today' }) },
    { k: 'clean', sheet: 'feed', label: () => 'Eat with no unhealthy items', done: (d, f) => f.food.length > 0 && f.bad === 0, prog: (d, f) => ({ txt: f.food.length ? (f.food.length - f.bad) + ' clean · ' + f.bad + ' unhealthy so far' : 'Nothing eaten yet' }) },
    { k: 'window', sheet: 'feed', label: s => 'Only eat healthy, between ' + s.windowStart + ' and ' + s.windowEnd, done: (d, f) => f.windowClean, prog: (d, f) => ({ txt: f.food.length ? (f.food.length - f.outside) + ' in window · ' + f.outside + ' outside' + (f.bad ? ' · ' + f.bad + ' unhealthy' : '') : 'Nothing eaten yet' }) },
    { k: 'water', sheet: 'daily', label: () => 'Hit your water target', done: d => waterOK(d), prog: (d, f, s) => { const w = (d && d.water) || 0, g = Math.ceil(Math.max(0, s.waterTarget - w) / 250); return { pct: Math.min(1, w / s.waterTarget), txt: +(w / 1000).toFixed(2) + ' / ' + s.waterTarget / 1000 + ' L' + (g ? ' · ' + g + ' glass' + (g > 1 ? 'es' : '') + ' to go' : '') }; } },
    { k: 'sleep', sheet: 'daily', label: () => 'Log 7+ hours of sleep', done: d => !!d && d.sleep != null && d.sleep >= 7, prog: d => ({ pct: d && d.sleep != null ? Math.min(1, d.sleep / 7) : 0, txt: d && d.sleep != null ? d.sleep + ' / 7 h' : 'Fills in from Health' }) }
  ];
  function waterOK(d) { return !!d && (d.events.some(e => e.type === 'water') || (d.water || 0) >= state.settings.waterTarget); }
  const WC = [
    { k: 'pushups', home: true, name: 'push-ups', min: 50, max: 150, step: 10, unit: 'reps', inc: [10, 25] },
    { k: 'squats', home: true, name: 'squats', min: 100, max: 200, step: 10, unit: 'reps', inc: [10, 25] },
    { k: 'situps', home: true, name: 'sit-ups', min: 50, max: 150, step: 10, unit: 'reps', inc: [10, 25] },
    { k: 'burpees', home: true, name: 'burpees', min: 30, max: 80, step: 5, unit: 'reps', inc: [5, 10] },
    { k: 'lunges', home: true, name: 'lunges', min: 50, max: 100, step: 10, unit: 'reps', inc: [10, 25] },
    { k: 'jacks', home: true, name: 'jumping jacks', min: 100, max: 300, step: 25, unit: 'reps', inc: [25, 50] },
    { k: 'plank', home: true, name: 'plank', min: 2, max: 5, step: 1, unit: 'min', inc: [0.5, 1] },
    { k: 'run', name: 'run', min: 2, max: 5, step: 0.5, unit: 'km', inc: [0.5, 1] },
    { k: 'boxing', name: 'boxing', min: 20, max: 45, step: 5, unit: 'min', inc: [1, 5] }
  ];
  const WC_HOME_FROM = '2026-11-06';
  function wcFor(ds) {
    let h = 2166136261; for (const c of 'w' + ds) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    let a = h >>> 0;
    const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pool = ds >= WC_HOME_FROM ? WC.filter(x => x.home) : WC; // at-home only from 6 Nov 2026; earlier days keep their pick
    const c = pool[Math.floor(rnd() * pool.length)], n = Math.round((c.max - c.min) / c.step);
    const target = +(c.min + c.step * Math.floor(rnd() * (n + 1))).toFixed(1);
    const pts = Math.round(15 + 20 * (target - c.min) / (c.max - c.min));
    const label = c.unit === 'reps' ? target + ' ' + c.name : c.k === 'run' ? 'Run ' + target + ' km' : c.k === 'plank' ? target + ' min plank' : target + ' min boxing';
    return Object.assign({}, c, { target, pts, label });
  }
  function wcDone(ds, d) { return !!d && (d.wc || 0) >= wcFor(ds).target; }
  function wcFmt(c, v) { return c.unit === 'reps' ? Math.round(v) + '' : +(+v).toFixed(1) + ''; }
  function stepQuest(ds) {
    let h = 2166136261; for (const c of 's' + ds) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    let a = (h >>> 0) + 0x6D2B79F5 | 0, t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const target = 10000 + 1000 * Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * 11);
    return { target, pts: 15 + 2 * (target - 10000) / 1000 };
  }
  function questsFor(ds) {
    let h = 2166136261; for (const c of 'q' + ds) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    let a = h >>> 0;
    const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const idx = QUESTS.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx.slice(0, 3).map(i => QUESTS[i]);
  }
  function comboParts(f, wc) { return { steps: f.stepsOK, workout: f.exercise > 0 || !!wc, window: f.food.length > 0 && f.outside === 0 }; }
  function fun() { return state.fun || (state.fun = {}); }

  const TITLES = [[1, 'Novice'], [5, 'Contender'], [10, 'Fighter'], [15, 'Champion']];

  let state = { settings: clone(DEFAULT_SETTINGS), days: {} };
  let ui = { tab: 'today', date: todayStr(), calMonth: null, photo: 0, gif: 0 };
  let chart = null;
  let lastLevel = null;

  // ---------- utils ----------
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dstr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr() { return dstr(new Date()); }
  function parseD(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(s, n) { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); }
  function nowTime() { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function weekKey(s) { // Monday of the week
    const d = parseD(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return dstr(d);
  }
  function fmtDate(s, opts) { return parseD(s).toLocaleDateString('en-GB', opts || { weekday: 'long', day: 'numeric', month: 'short' }); }
  function sign(n) { return n > 0 ? '+' + n : String(n); }
  function cls(n) { return n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function day(s) { if (!state.days[s]) state.days[s] = { events: [], steps: null, weight: null }; return state.days[s]; }
  function rhrBase(ds) { // 30-day average resting heart rate before this day (needs 5+ readings)
    const v = []; for (let i = 1; i <= 30; i++) { const d = state.days[addDays(ds, -i)]; if (d && d.rhr != null) v.push(d.rhr); }
    return v.length >= 5 ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }
  function hasData(d) { return d && (d.events.length || d.steps != null || d.weight != null || d.sleep != null || d.protein || d.water); }

  function mergeSettings(s) {
    const out = Object.assign(clone(DEFAULT_SETTINGS), s || {});
    out.pts = Object.assign(clone(DEFAULT_SETTINGS.pts), (s && s.pts) || {});
    return out;
  }

  // ---------- levels ----------
  function threshold(L) { return 75 * (L - 1) * L; } // L1:0, L2:150, L3:450, L4:900 ...
  function levelOf(xp) { let L = 1; while (threshold(L + 1) <= xp) L++; return L; }
  function titleOf(L) { let t = TITLES[0][1]; for (const [min, name] of TITLES) if (L >= min) t = name; return t; }

  // ---------- scoring engine ----------
  function inWindow(t, s) { return t >= s.windowStart && t <= s.windowEnd; }

  function dayFlags(d, s) {
    const ev = d ? d.events : [];
    const food = ev.filter(e => ACTIONS[e.type] && ACTIONS[e.type].group === 'food');
    const outside = food.filter(e => !inWindow(e.time, s)).length;
    const healthy = ev.filter(e => e.type === 'healthy').length;
    const bad = ev.filter(e => ['unhealthy', 'overate', 'alcohol'].includes(e.type)).length;
    const exercise = ev.filter(e => ACTIONS[e.type] && ACTIONS[e.type].group === 'ex').length;
    return {
      food, outside, healthy, bad, exercise,
      stepsOK: d && d.steps != null && d.steps >= s.stepTarget,
      windowOK: food.length > 0 && outside === 0,
      windowClean: food.length > 0 && outside === 0 && bad === 0,
      healthyOK: healthy > 0 && bad === 0
    };
  }

  function mult(len) { return len >= 30 ? 2 : len >= 7 ? 1.5 : 1; }

  function avg7(endStr) {
    const vals = [];
    for (let i = 0; i < 7; i++) { const d = state.days[addDays(endStr, -i)]; if (d && d.weight != null) vals.push(d.weight); }
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  // Replays every day from the first logged day to today, returning per-day results and running totals.
  function compute() {
    const s = state.settings, P = s.pts, today = todayStr();
    const keys = Object.keys(state.days).filter(k => hasData(state.days[k]) && k <= today).sort();
    const res = { days: {}, xp: 0, level: 1, streaks: { steps: 0, window: 0, healthy: 0 }, badges: {}, weekly: [], freezes: 0, stars: 0, peak: 1 };
    if (!keys.length) { peakL = 1; return res; }

    const streak = { steps: { len: 0, frz: null }, window: { len: 0, frz: null }, healthy: { len: 0, frz: null } };
    let xp = 0, kgHeld = 0, pctHeld = 0, goalReached = false, prevSunAvg = null, frz = 0, stars = 0, peakXp = 0;
    const SNAME = { steps: 'steps', window: 'eating window', healthy: 'clean eating' };

    for (let ds = keys[0]; ds <= today; ds = addDays(ds, 1)) {
      const d = state.days[ds], f = dayFlags(d, s), isToday = ds === today, wk = weekKey(ds);
      const lines = [];

      // streak update
      const q = { steps: f.stepsOK, window: f.windowOK, healthy: f.healthyOK };
      const lenFor = {};
      for (const k of Object.keys(streak)) {
        const st = streak[k];
        if (q[k]) { st.len++; lenFor[k] = st.len; if (st.len % 7 === 0 && frz < 2) { frz++; lines.push({ label: 'Streak freeze earned (' + SNAME[k] + ' ' + st.len + ' days)', pts: 0, info: true }); } }
        else if (isToday) { lenFor[k] = 0; } // pending — keep streak alive
        else if (st.len > 0 && frz > 0) { frz--; lenFor[k] = 0; lines.push({ label: 'Streak freeze used (' + SNAME[k] + ')', pts: 0, info: true }); }
        else { st.len = 0; lenFor[k] = 0; }
      }

      if (d) {
        // food
        const hc = Math.min(f.healthy, P.healthyMax);
        if (f.healthy) {
          const m = mult(lenFor.healthy), v = Math.round(hc * P.healthy * m);
          lines.push({ label: 'Healthy meals ×' + f.healthy + (f.healthy > P.healthyMax ? ' (max ' + P.healthyMax + ' count)' : '') + (m > 1 ? ' · streak ×' + m : ''), pts: v });
        }
        const cnt = t => d.events.filter(e => e.type === t).length;
        if (cnt('unhealthy')) lines.push({ label: 'Unhealthy items ×' + cnt('unhealthy'), pts: cnt('unhealthy') * P.unhealthy });
        if (cnt('overate')) lines.push({ label: 'Overate ×' + cnt('overate'), pts: cnt('overate') * P.overate });
        if (cnt('alcohol')) lines.push({ label: 'Alcohol ×' + cnt('alcohol'), pts: cnt('alcohol') * P.alcohol });
        if (f.outside) lines.push({ label: 'Ate outside window ×' + f.outside, pts: f.outside * P.outside });
        if (f.windowClean) { const m = mult(lenFor.window); lines.push({ label: 'All food healthy, inside window' + (m > 1 ? ' · streak ×' + m : ''), pts: Math.round(P.windowBonus * m) }); }
        // exercise
        for (const t of ['boxing', 'strength', 'cardio']) if (cnt(t)) lines.push({ label: ACTIONS[t].label + ' ×' + cnt(t), pts: cnt(t) * P[t] });
        // steps
        if (f.stepsOK) { const m = mult(lenFor.steps); lines.push({ label: d.steps.toLocaleString() + ' steps' + (m > 1 ? ' · streak ×' + m : ''), pts: Math.round(P.steps * m) }); }
        if (d.steps != null && d.steps >= s.stepBonusAt) lines.push({ label: s.stepBonusAt.toLocaleString() + '+ steps bonus', pts: P.stepsBonus });
        if (waterOK(d)) lines.push({ label: 'Water target', pts: P.water });
        if ((d.protein || 0) >= s.proteinTarget) lines.push({ label: 'Protein target (' + d.protein + ' g)', pts: P.protein });
        if (d.sleep != null) {
          if (d.sleep >= 7 && d.sleep <= 9) lines.push({ label: 'Slept ' + d.sleep + ' h', pts: P.sleepGood });
          else if (d.sleep < 6) lines.push({ label: 'Short sleep (' + d.sleep + ' h)', pts: P.sleepBad });
        }
        if (d.rhr != null) { const b = rhrBase(ds); if (b != null && d.rhr < Math.round(b)) lines.push({ label: 'Resting heart rate ' + d.rhr + ' bpm (avg ' + Math.round(b) + ')', pts: P.rhrLow }); }
        if (cnt('complete')) lines.push({ label: 'Logged everything', pts: P.complete });
        if (ds >= BONUS_FROM) {
          let qn = 0;
          const sq = stepQuest(ds);
          if ((d.steps || 0) >= sq.target) { qn++; lines.push({ label: 'Quest: ' + sq.target.toLocaleString() + ' steps', pts: sq.pts }); }
          if (wcDone(ds, d)) { const wc = wcFor(ds); qn++; lines.push({ label: 'Quest: ' + wc.label, pts: wc.pts }); }
          for (const q of questsFor(ds)) if (q.done(d, f)) { qn++; lines.push({ label: 'Quest: ' + q.label(s), pts: P.quest }); }
          if (qn === 5) lines.push({ label: 'All 5 quests done', pts: P.questAll });
          const c = comboParts(f, wcDone(ds, d));
          if (c.steps && c.workout && c.window) {
            const pos = lines.reduce((x, l) => x + (l.pts > 0 ? l.pts : 0), 0), b = Math.round(pos * 0.5);
            if (b) lines.push({ label: 'Combo ×1.5 (steps + workout + eating window)', pts: b });
          }
        }
      }
      // low activity (only once the day is over)
      const lowAct = (!d || d.steps == null || d.steps < s.lowSteps) && f.exercise === 0;
      if (!isToday && lowAct) lines.push({ label: 'Low activity day', pts: P.lowSteps });

      const raw = lines.reduce((a, l) => a + l.pts, 0);
      const net = Math.max(raw, s.dailyCap);
      const capped = net !== raw;

      // weight milestones (based on 7-day average)
      const extra = [];
      const a = avg7(ds);
      if (a != null && s.startWeight) {
        const lost = s.startWeight - a;
        const kg = Math.max(0, Math.floor(lost + 1e-9));
        const pct = Math.max(0, Math.floor(lost / (s.startWeight * 0.05) + 1e-9));
        if (kg !== kgHeld) {
          extra.push({ label: kg > kgHeld ? (kg - kgHeld) + ' kg milestone' + (kg - kgHeld > 1 ? 's' : '') + ' reached' : 'Lost ' + (kgHeld - kg) + ' kg milestone' + (kgHeld - kg > 1 ? 's' : ''), pts: (kg - kgHeld) * P.kgMilestone, weight: true });
          for (let i = kgHeld + 1; i <= kg; i++) if (!res.badges['kg' + i]) res.badges['kg' + i] = ds;
          kgHeld = kg;
        }
        if (pct !== pctHeld) {
          extra.push({ label: pct > pctHeld ? (pct * 5) + '% body weight milestone' : 'Dropped below ' + (pctHeld * 5) + '% milestone', pts: (pct - pctHeld) * P.pctMilestone, weight: true });
          for (let i = pctHeld + 1; i <= pct; i++) if (!res.badges['pct' + i]) res.badges['pct' + i] = ds;
          pctHeld = pct;
        }
        if (s.goalWeight && a <= s.goalWeight && !goalReached) { goalReached = true; if (!res.badges.goal) res.badges.goal = ds; }
      }
      // weekly trend on Sundays (once the Sunday has passed or is today)
      if (parseD(ds).getDay() === 0) {
        if (a != null && prevSunAvg != null) {
          const diff = a - prevSunAvg;
          let wl = null;
          if (goalReached && s.goalWeight) {
            if (Math.abs(a - s.goalWeight) <= s.maintenanceBand) wl = { label: 'Maintenance week inside ±' + s.maintenanceBand + ' kg', pts: P.maintainWeek, weight: true };
            else if (a > s.goalWeight + s.maintenanceBand) wl = { label: 'Above maintenance band', pts: P.trendUp, weight: true };
          } else if (diff > s.trendTolerance) wl = { label: 'Weekly average up ' + r1(diff) + ' kg', pts: P.trendUp, weight: true };
          if (wl) extra.push(wl);
          res.weekly.push({ date: ds, avg: a, diff });
        } else if (a != null) res.weekly.push({ date: ds, avg: a, diff: null });
        if (a != null) prevSunAvg = a;
      }

      const extraPts = extra.reduce((x, l) => x + l.pts, 0);
      const delta = net + extraPts;
      const before = xp;
      xp = Math.max(0, xp + delta);
      if (delta > 0) stars += delta;
      peakXp = Math.max(peakXp, xp);
      res.days[ds] = { lines, extra, raw, net, capped, delta, xpBefore: before, xpAfter: xp, avg: a, lowActPending: isToday && lowAct, flags: f };
    }

    res.xp = xp;
    res.level = levelOf(xp);
    res.streaks = { steps: streak.steps.len, window: streak.window.len, healthy: streak.healthy.len };
    res.kgHeld = kgHeld; res.pctHeld = pctHeld; res.goalReached = goalReached;
    res.freezes = frz; res.stars = stars; res.peak = levelOf(peakXp);
    peakL = res.peak;
    return res;
  }

  // ---------- persistence ----------
  let saveTimer = null;
  const syncEl = () => document.getElementById('sync');
  function setSync(t, err) { const el = syncEl(); el.textContent = t; el.classList.toggle('err', !!err); }

  async function load() {
    if (!API) { setSync('Offline: changes not saved', true); return; }
    try {
      const r = await fetch(API + '/api/state', { headers: AH });
      const j = await r.json();
      if (j.state) { state = j.state; state.settings = mergeSettings(state.settings); state.days = state.days || {}; state.fun = state.fun || {}; if (!state.fun.sunflowerDefault) { state.fun.sunflowerDefault = 1; state.settings.theme = 'sunflower'; setTimeout(save, 0); } if (state.fun.photo && state.fun.photo.date === todayStr()) ui.photo = state.fun.photo.off; if (state.fun.gif && state.fun.gif.date === todayStr()) ui.gif = state.fun.gif.off; }
      setSync('Saved');
    } catch (e) { setSync('Could not reach server', true); }
  }
  // ---------- Apple Health import (values pushed by the iPhone Shortcut) ----------
  const HL = { key: null, last: null };
  async function healthSync() {
    if (!API) return;
    try {
      const j = await (await fetch(API + '/api/health', { headers: AH })).json(); HL.key = j.key;
      const apply = dry => {
        let ch = false;
        for (const [ds, h] of Object.entries(j.days || {})) {
          const d = state.days[ds] || (dry ? { events: [], steps: null, weight: null } : day(ds));
          if (h.steps != null && (d.steps == null || d.stepsSrc === 'health') && d.steps !== h.steps) { ch = true; if (!dry) { d.steps = h.steps; d.stepsSrc = 'health'; } }
          if (h.sleep != null && (d.sleep == null || d.sleepSrc === 'health') && d.sleep !== h.sleep) { ch = true; if (!dry) { d.sleep = h.sleep; d.sleepSrc = 'health'; } }
          if (h.rhr != null && d.rhr !== h.rhr) { ch = true; if (!dry) d.rhr = h.rhr; }
          if (h.updated && (!HL.last || h.updated > HL.last)) HL.last = h.updated;
        }
        return ch;
      };
      if (apply(true)) commit(() => apply(false), true); else if (ui.tab === 'settings') render();
    } catch (e) { }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') healthSync(); });
  setInterval(healthSync, 5 * 60 * 1000);
  const HTAG = '<span class="htag" title="Imported from Apple Health">Health</span>';
  function save() {
    setSync('Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (!API) { setSync('Offline: changes not saved', true); return; }
      try {
        const r = await fetch(API + '/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...AH }, body: JSON.stringify({ state }) });
        if (!r.ok) throw new Error(r.status);
        setSync('Saved');
      } catch (e) { setSync('Save failed — retrying', true); setTimeout(save, 4000); }
    }, 350);
  }

  // ---------- feedback ----------
  function toast(text, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = text;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
  function confirmBox(text) {
    return new Promise(res => {
      const m = document.getElementById('modal');
      document.getElementById('modal-text').textContent = text;
      m.hidden = false;
      const done = v => { m.hidden = true; yes.onclick = no.onclick = null; res(v); };
      const yes = document.getElementById('modal-yes'), no = document.getElementById('modal-no');
      yes.onclick = () => done(true); no.onclick = () => done(false);
    });
  }

  function commit(feedbackFn, quiet, noLevel) {
    const before = compute();
    const beforeDay = before.days[ui.date] ? before.days[ui.date].delta : 0;
    feedbackFn && feedbackFn();
    const after = compute();
    const afterDay = after.days[ui.date] ? after.days[ui.date].delta : 0;
    const diff = afterDay - beforeDay;
    if (diff && !quiet) toast(sign(diff) + ' XP', diff > 0 ? 'pos' : 'neg');
    const lvl = !noLevel && after.level !== before.level;
    const fresh = after.peak > before.peak ? DANIELLE.concat(DANI_GIFS).filter(x => x.lv > before.peak && x.lv <= after.peak) : [];
    if (lvl) setTimeout(() => levelMoment(after.level, after.level > before.level, fresh), 700);
    else if (!noLevel && !quiet && ui.date === todayStr()) {
      const has = (r, pre) => !!(r.days[ui.date] && r.days[ui.date].lines.concat(r.days[ui.date].extra).some(l => l.label.startsWith(pre)));
      if (has(after, 'All 3 quests') && !has(before, 'All 3 quests')) setTimeout(() => bigWin('All 3 quests done', ['h', 't']), 600);
      else if (has(after, 'Combo') && !has(before, 'Combo')) setTimeout(() => bigWin('Combo ×1.5 is on', ['t', 'h']), 600);
    }
    save();
    render();
    return diff;
  }

  // ---------- views ----------
  const view = () => document.getElementById('view');

  function xpBlock(r) {
    const L = r.level, lo = threshold(L), hi = threshold(L + 1);
    const pct = Math.min(100, ((r.xp - lo) / (hi - lo)) * 100);
    return { L, lo, hi, pct };
  }

  function renderToday(levelOnly) {
    const s = state.settings, P = s.pts, r = compute(), ds = levelOnly ? todayStr() : ui.date, isToday = ds === todayStr();
    const d = state.days[ds] || { events: [], steps: null, weight: null };
    const dr = r.days[ds];
    const net = dr ? dr.delta : 0;
    const x = xpBlock(r);
    const f = dayFlags(d, s);
    const count = t => d.events.filter(e => e.type === t).length;

    const actBtn = (t, pts) => {
      const a = ACTIONS[t], n = count(t), done = a.once && n > 0;
      return `<button class="act ${a.good ? 'good' : 'bad'} ${done ? 'done' : ''}" data-act="${t}" ${done ? 'aria-pressed="true"' : ''}>
        <span>${a.label}${n && !a.once ? `<span class="cnt">×${n}</span>` : ''}</span><span class="pts">${sign(pts)}</span></button>`;
    };

    const stepPct = d.steps ? Math.min(100, d.steps / s.stepTarget * 100) : 0;
    let stepHint = '';
    if (d.steps == null) stepHint = `<span class="hint">Target ${s.stepTarget.toLocaleString()} steps.</span>`;
    else if (d.steps >= s.stepBonusAt) stepHint = `<span class="hint" style="color:var(--plus)">Target and bonus hit.</span>`;
    else if (d.steps >= s.stepTarget) stepHint = `<span class="hint" style="color:var(--plus)">Target hit. ${(s.stepBonusAt - d.steps).toLocaleString()} more for the bonus.</span>`;
    else stepHint = `<span class="hint">${(s.stepTarget - d.steps).toLocaleString()} steps to target.</span>`;
    const lowWarn = dr && dr.lowActPending ? `<p class="hint warn" style="margin-top:8px">Under ${s.lowSteps.toLocaleString()} steps and no workout yet: ${P.lowSteps} at midnight.</p>` : '';

    const timeOut = !inWindow(nowTime(), s) && isToday;

    const lines = dr ? dr.lines.concat(dr.extra) : [];
    const log = d.events.slice().sort((a, b) => a.time.localeCompare(b.time));

    let banner = '';
    if (s.showDanielle) {
      const gm = fun().bannerMode === 'gif', gf = gifPick(ds, ui.gif);
      const ph = dmPick(ds, ui.photo), tier = dr ? tierOf(net) : null;
      const msg = !dr ? 'New day. Let’s make it a huge day.'
        : tier === 'great' ? 'Huge day. Keep it going.'
        : tier === 'okay' ? (s.stickerGreat - net) + ' more points for a huge day.'
        : 'Turn it around. Log something good.';
      banner = `<div class="dm-tabs" role="tablist" aria-label="Banner type"><button role="tab" data-bm="photo" class="${gm ? '' : 'on'}" aria-selected="${!gm}">Photos</button><span aria-hidden="true">·</span><button role="tab" data-bm="gif" class="${gm ? 'on' : ''}" aria-selected="${gm}">GIFs</button></div>
      <div class="dm-banner">
        <button class="dm-tap${gm ? ' gif' : ''}" id="dm-next" aria-label="Show the next ${gm ? 'GIF' : 'photo'} of Danielle">
          ${gm ? `<img class="dm-blur" src="${gf.poster}" alt="">${gifVid(gf, 'dm-vid')}` : `<img class="ld${ph.fit === 'contain' ? ' dm-contain' : ''}" src="${ph.img}${ph.fit ? '?v=3' : ''}" alt="Danielle Marsh">`}
          <span class="dm-cap"><b>${esc(msg)}</b></span>
          ${gm ? '' : `<span class="dm-dots">${unl(DANIELLE).map(p => `<i class="${p === ph ? 'on' : ''}"></i>`).join('')}</span>`}
        </button>
        <button class="dm-shuf" id="dm-shuf" aria-label="Shuffle to a random ${gm ? 'GIF' : 'photo'}"><svg viewBox="0 0 24 24">${SHUF_ICON}</svg></button>

      </div>`;
    }
    const meals = d.events.filter(e => ACTIONS[e.type].group === 'food').length;
    const works = d.events.filter(e => ACTIONS[e.type].group === 'ex').length;
    let questCard = '';
    if (ds >= BONUS_FROM) {
      const sq = stepQuest(ds), sst = d.steps || 0, sdone = sst >= sq.target;
      const wc = wcFor(ds), wv = d.wc || 0, wdone = wv >= wc.target;
      const qs = questsFor(ds).map(q => ({ label: q.label(s), done: !!q.done(d, f), sheet: q.sheet, pr: q.prog ? q.prog(d, f, s) : null })), qn = qs.filter(q => q.done).length + (sdone ? 1 : 0) + (wdone ? 1 : 0);
      const qbar = pct => `<u class="sqbar"><s style="width:${Math.round(Math.min(1, pct) * 100)}%"></s></u>`;
      const c = comboParts(f, wcDone(ds, d)), on = c.steps && c.workout && c.window;
      const tick = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
      questCard = `<section class="card">
        <h2>Daily quests <small class="num">${qn}/5 done</small></h2>
        <ul class="qlist">
          <li class="sq tap ${sdone ? 'done' : ''}" data-qs="steps" role="button" tabindex="0"><i>${sdone ? tick : ''}</i><span>Walk ${sq.target.toLocaleString()} steps<em class="num">${sst.toLocaleString()} / ${sq.target.toLocaleString()}${sdone ? '' : ' · ' + (sq.target - sst).toLocaleString() + ' to go'}</em><u class="sqbar"><s style="width:${Math.min(100, sst / sq.target * 100)}%"></s></u></span><b class="num">+${sq.pts}</b></li>
          <li class="sq tap ${wdone ? 'done' : ''}" data-qs="wc" role="button" tabindex="0"><i>${wdone ? tick : ''}</i><span>${esc(wc.label.charAt(0).toUpperCase() + wc.label.slice(1))}<em class="num">${wcFmt(wc, wv)} / ${wcFmt(wc, wc.target)} ${wc.unit}${wdone ? '' : ' · ' + wcFmt(wc, wc.target - wv) + ' to go'}</em>${qbar(wv / wc.target)}</span><b class="num">+${wc.pts}</b></li>${qs.map(q => `<li class="sq tap ${q.done ? 'done' : ''}" data-qs="${q.sheet || ''}" role="button" tabindex="0"><i>${q.done ? tick : ''}</i><span>${esc(q.label)}${q.pr ? `<em class="num">${esc(q.pr.txt)}</em>${q.pr.pct != null ? qbar(q.pr.pct) : ''}` : ''}</span><b class="num">+${P.quest}</b></li>`).join('')}</ul>
        <div class="combo ${on ? 'on' : ''}">
          <b>${on ? 'Combo ×1.5 on' : 'Combo ×1.5'}</b>
          <div class="cparts">${[['steps', 'Steps'], ['workout', 'Workout'], ['window', 'Eating window']].map(([k, l]) => `<span class="${c[k] ? 'ok' : ''}">${l}</span>`).join('')}</div>
        </div>
      </section>`;
    }
    const statsRow = `<div class="pet-stats">
          <button data-orb="feed"><b class="num">${meals}</b><span>meals</span></button>
          <button data-orb="ex"><b class="num">${works}</b><span>workouts</span></button>
          <button data-orb="steps"><b class="num">${d.steps != null ? d.steps.toLocaleString() : '—'}</b><span>steps${d.stepsSrc === 'health' ? ' ' + HTAG : ''}</span></button>
          <button data-orb="weight"><b class="num">${d.weight != null ? d.weight : '—'}</b><span>kg</span></button>
        </div>
        <div class="stepbar" style="margin-top:10px"><i style="width:${stepPct}%"></i></div>
        <div style="margin-top:6px">${stepHint}</div>${lowWarn}
        ${!s.startWeight ? `<p class="hint warn" style="margin-top:8px">Set your start and goal weight in Rules to unlock weight milestones.</p>` : ''}`;
    const prot = d.protein || 0, wat = d.water || 0;
    const fbar = (v, t) => Math.min(100, t ? v / t * 100 : 0);
    const fuelCard = `<section class="card fuel">
        <h2>Fuel and sleep</h2>
        <div class="frow">
          <div class="fl"><b>Protein</b><span class="num">${prot} / ${s.proteinTarget} g</span><div class="fbar p"><i style="width:${fbar(prot, s.proteinTarget)}%"></i></div></div>
          <div class="fb"><button class="btn ghost sm" data-fuel="protein" data-v="-10" aria-label="Minus 10 grams protein">−</button><button class="btn ghost sm" data-fuel="protein" data-v="10">+10</button><button class="btn ghost sm" data-fuel="protein" data-v="25">+25</button></div>
        </div>
        <div class="frow">
          <div class="fl"><b>Water</b><span class="num">${+(wat / 1000).toFixed(2)} / ${(s.waterTarget / 1000)} L</span><div class="fbar w"><i style="width:${fbar(wat, s.waterTarget)}%"></i></div></div>
          <div class="fb"><button class="btn ghost sm" data-fuel="water" data-v="-250" aria-label="Minus one glass of water">−</button><button class="btn ghost sm" data-fuel="water" data-v="250">+1 glass</button></div>
        </div>
        <div class="frow">
          <div class="fl"><b>Sleep</b><span class="num">${d.sleep != null ? d.sleep + ' h last night' + (d.sleepSrc === 'health' ? ' ' + HTAG : '') : 'Not logged'}</span><div class="fbar s"><i style="width:${d.sleep != null ? Math.min(100, d.sleep / 8 * 100) : 0}%"></i></div></div>
          <div class="fb"><button class="btn ghost sm" data-orb="daily">${d.sleep != null ? 'Edit' : 'Log sleep'}</button></div>
        </div>
        ${d.rhr != null || Object.values(state.days).some(x => x.rhr != null) ? (() => { const b = rhrBase(ds); return `<div class="frow">
          <div class="fl"><b>Resting heart rate</b><span class="num">${d.rhr != null ? d.rhr + ' bpm ' + HTAG : 'No reading yet'}</span><span class="rhr-sub">${b != null ? '30-day average ' + Math.round(b) + ' bpm' + (d.rhr != null && d.rhr < Math.round(b) ? ' · below average, ' + sign(P.rhrLow) : '') : 'Average appears after 5 readings'}</span></div>
        </div>`; })() : ''}
      </section>`;
    const levelCard = `      <section class="card">
        <div class="hero">
          ${dr ? `<div class="hero-st">${stickerImg(net, 76, 'big', addDays(ds, 1))}</div>` : '<div class="hero-st empty-st" aria-hidden="true"></div>'}
          <div>
            <div class="label">Level ${x.L}</div>
            <div class="lvl-title"><span class="t">${titleOf(x.L)}</span></div>
          </div>
          <div class="dayscore ${cls(net)}"><b class="num">${sign(net)}</b><span>${isToday ? 'today' : 'this day'}</span></div>
        </div>
        ${dr ? `<p class="st-line"><b>${STICKERS[tierOf(net)].label}</b>${isToday ? ' so far' : ''}${tierOf(net) === 'okay' ? ` — ${s.stickerGreat - net} more for a huge day` : tierOf(net) === 'poor' ? ` — ${s.stickerPoor + 1 - net} more for a solid day` : ''}</p>` : ''}
        <div class="xpbar" role="progressbar" aria-valuemin="${x.lo}" aria-valuemax="${x.hi}" aria-valuenow="${r.xp}"><i style="width:${x.pct}%"></i></div>
        <div class="xpmeta num"><span>${r.xp.toLocaleString()} XP</span><span>${(x.hi - r.xp).toLocaleString()} to level ${x.L + 1}${x.L > 1 ? ' · drop below ' + x.lo.toLocaleString() + ' = level ' + (x.L - 1) : ''}</span></div>
        ${dr && dr.capped ? `<p class="capnote">Daily loss capped at ${s.dailyCap} (raw ${dr.raw}).</p>` : ''}
        <div class="chips">
          ${chip('Steps', r.streaks.steps)}${chip('Eating window', r.streaks.window)}${chip('Clean eating', r.streaks.healthy)}${frzChip(r)}
        </div>
        ${isToday ? meterRows(meters(r)) : ''}
        ${statsRow}
      </section>`;
    if (levelOnly) return levelCard;
    view().innerHTML = `
      <div class="datenav">
        <button class="iconbtn" data-nav="-1" aria-label="Previous day"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
        <div style="text-align:center"><h1>${isToday ? 'Today' : esc(fmtDate(ds, { weekday: 'long' }))}</h1><div class="sub">${esc(fmtDate(ds, { day: 'numeric', month: 'long', year: 'numeric' }))}</div></div>
        <button class="iconbtn" data-nav="1" aria-label="Next day" ${isToday ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
      </div>

      ${banner}
      ${questCard}

      <details class="card fold" data-fold="bd"${ui.fold && ui.fold.bd ? ' open' : ''}>
        <summary><h2>Points breakdown</h2><span class="fsum num ${cls(net)}">${sign(net)} XP</span><svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></summary>
        ${lines.length ? `<ul class="lines">${lines.map(l => `<li><span>${esc(l.label)}</span><span class="p ${cls(l.pts)}">${l.info ? '—' : sign(l.pts)}</span></li>`).join('')}</ul>` : '<p class="empty">Nothing logged yet.</p>'}
      </details>

      <details class="card fold" data-fold="log"${ui.fold && ui.fold.log ? ' open' : ''}>
        <summary><h2>Log</h2><span class="fsum num">${log.length} ${log.length === 1 ? 'entry' : 'entries'}</span><svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></summary>
        ${log.length ? `<ul class="lines">${log.map(e => `<li><span>${esc(ACTIONS[e.type].label)}<span class="meta">${e.time}${ACTIONS[e.type].group === 'food' && !inWindow(e.time, s) ? ' · outside window' : ''}</span></span><button class="x" data-del="${e.id}" aria-label="Remove ${esc(ACTIONS[e.type].label)}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>`).join('')}</ul>` : '<p class="empty">Tap a button above to log it.</p>'}
      </details>`;
    view().querySelectorAll('[data-qs]').forEach(el => { const go = () => { if (!el.dataset.qs) return; walkerRing(false); openSheet(el.dataset.qs); }; el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; });
    view().querySelectorAll('details.fold').forEach(el => el.addEventListener('toggle', () => { ui.fold = ui.fold || {}; ui.fold[el.dataset.fold] = el.open; }));

    const dmb = document.getElementById('dm-next');
    const dmi = dmb && dmb.querySelector('img:not(.dm-blur)');
    if (dmi) {
      const fail = () => {
        if (!dmi.dataset.retry) { dmi.dataset.retry = '1'; setTimeout(() => { dmi.src = dmi.src.split('#')[0] + (dmi.src.includes('?') ? '&' : '?') + 'r=' + Date.now(); }, 800); }
        else if ((ui.dmSkip = (ui.dmSkip || 0) + 1) <= 3) { ui.photo = (ui.photo || 0) + 1; render(); }
      };
      dmi.addEventListener('error', fail);
      dmi.addEventListener('load', () => { ui.dmSkip = 0; dmi.classList.remove('ld'); dmPrefetch(); });
      if (dmi.complete && dmi.naturalWidth > 0) { dmi.classList.remove('ld'); dmPrefetch(); }
      else if (dmi.complete && dmi.src) fail();
    }
    const gmode = fun().bannerMode === 'gif';
    if (dmb) dmb.onclick = () => { if (gmode) ui.gif++; else ui.photo++; render(); };
    view().querySelectorAll('[data-bm]').forEach(b => b.onclick = () => { if (fun().bannerMode === b.dataset.bm || (!fun().bannerMode && b.dataset.bm === 'photo')) return; fun().bannerMode = b.dataset.bm; save(); render(); });
    const dms = document.getElementById('dm-shuf');
    if (dms) dms.onclick = () => {
      if (gmode) {
        const n = unl(DANI_GIFS).length, base = dayIndex(ds), cur = ((base + ui.gif) % n + n) % n;
        let k = cur; while (k === cur && n > 1) k = Math.floor(Math.random() * n);
        ui.gif = k - base;
        if (isToday) { fun().gif = { date: ds, off: ui.gif }; save(); }
        render(); return;
      }
      const n = unl(DANIELLE).length, base = dayIndex(ds), cur = ((base + ui.photo) % n + n) % n;
      let k = cur; while (k === cur && n > 1) k = Math.floor(Math.random() * n);
      ui.photo = k - base;
      if (isToday) { fun().photo = { date: ds, off: ui.photo }; save(); }
      render();
    };
    view().querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
      const n = addDays(ui.date, +b.dataset.nav); if (n <= todayStr()) { ui.date = n; render(); window.scrollTo(0, 0); }
    });
    view().querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      commit(() => { const dd = day(ds); dd.events = dd.events.filter(e => e.id !== b.dataset.del); });
    });
    view().querySelectorAll('[data-orb]').forEach(b => b.onclick = () => { walkerRing(false); openSheet(b.dataset.orb); });
    view().querySelectorAll('[data-fuel]').forEach(b => b.onclick = () => {
      const k = b.dataset.fuel, v = +b.dataset.v, cur = (state.days[ds] && state.days[ds][k]) || 0;
      if (cur + v < 0) return;
      const tgt = k === 'protein' ? s.proteinTarget : s.waterTarget, hit = cur < tgt && cur + v >= tgt;
      const diff = commit(() => { day(ds)[k] = cur + v; }, true);
      const left = Math.max(0, tgt - cur - v);
      react(diff, k === 'protein' ? (left ? left + ' g protein to go.' : 'Protein target hit.') : (left ? Math.ceil(left / 250) + ' more glass' + (Math.ceil(left / 250) > 1 ? 'es' : '') + ' to go.' : 'Water target hit.'));
      if (hit) toast((k === 'protein' ? 'Protein' : 'Water') + ' target hit', 'pos');
    });
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSheet(); walkerRing(false); } });
  // ---------- Danielle sticker: reactions + log sheet ----------
  const SAY_GOOD = ['Nice. ', 'Yes. ', 'Proud of you. ', 'Keep going. ', 'Love that. '];
  const SAY_BAD = ['Ouch. ', 'Hmm. ', 'We can fix this. ', 'Not ideal. '];
  // ---------- meters ----------
  function meters(r) {
    r = r || compute();
    const s = state.settings, ds = todayStr(), d = state.days[ds] || { events: [], steps: null, weight: null }, f = dayFlags(d, s), dr = r.days[ds];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const map = n => clamp((n + 50) / 200, 0, 1);
    const t = map(dr ? dr.delta : 0);
    let sum = 0, n = 0;
    for (let i = 1; i <= 7; i++) { const x = r.days[addDays(ds, -i)]; if (x) { sum += map(x.delta); n++; } }
    const w = n ? sum / n : 0.25;
    const st = clamp(Math.max(r.streaks.steps, r.streaks.window, r.streaks.healthy) / 7, 0, 1);
    let h = 60 * t + 30 * w + 10 * st, maxXp = 0;
    for (let i = 0; i < 7; i++) { const x = r.days[addDays(ds, -i)]; if (x) { maxXp = Math.max(maxXp, x.xpAfter, x.xpBefore); } }
    for (let i = 0; i < 7; i++) { const x = r.days[addDays(ds, -i)]; if (x && x.extra.some(l => l.weight && l.pts < 0)) { h -= 10; break; } }
    if (levelOf(maxXp) > r.level) h -= 10;
    const mins = tt => +tt.slice(0, 2) * 60 + +tt.slice(3, 5);
    const ws = mins(s.windowStart), we = mins(s.windowEnd), nm = mins(nowTime());
    const awake = nm >= ws && nm <= we, rate = 100 / 300;
    let v = 35, last = ws;
    const meals = f.food.filter(e => inWindow(e.time, s) && mins(e.time) <= nm).sort((a, b) => a.time.localeCompare(b.time));
    for (const e of meals) { const m = mins(e.time); v = Math.max(0, v - Math.max(0, m - last) * rate); v = Math.min(100, v + (e.type === 'healthy' ? 45 : 25)); last = Math.max(last, m); }
    v = Math.max(0, v - Math.max(0, clamp(nm, ws, we) - last) * rate);
    const sl = d.sleep == null ? 10 : d.sleep >= 7 ? 30 : d.sleep >= 6 ? 15 : 0;
    const energy = Math.min(100, sl + f.exercise * 30 + (d.steps ? Math.min(1, d.steps / s.stepTarget) * 45 : 0));
    return { happy: Math.round(clamp(h, 0, 100)), hunger: Math.round(100 - v), full: Math.round(v), energy: Math.round(energy), awake };
  }
  function meterRows(m, compact) {
    const row = (k, l, v, note) => `<div class="mrow m-${k}"><span>${l}</span><div class="mbar"><i style="width:${v}%"></i></div><b class="num">${note || v}</b></div>`;
    return `<div class="meters ${compact ? 'compact' : ''}">
      ${row('happy', 'Happiness', m.happy)}
      ${row('food', 'Fullness', m.full, m.awake ? '' : 'Zz')}
      ${row('energy', 'Energy', m.energy)}
    </div>`;
  }
  // ---------- hearts ----------
  const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.1 5 2.9 1.4-1.8 2.9-2.9 5-2.9 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  const PXHEART = (() => { const g = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']; let r = ''; g.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'X') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; })); return `<svg viewBox="0 0 7 6" shape-rendering="crispEdges">${r}</svg>`; })();
  function spawnHearts(n) {
    if (!WK.el || reduceMotion && n < 2) return;
    const body = WK.el.querySelector('#wk-body'), px = state.settings.petStyle === 'pixel';
    for (let i = 0; i < n; i++) {
      const h = document.createElement('span');
      h.className = 'heart' + (px ? ' px' : '');
      h.innerHTML = px ? PXHEART : HEART;
      h.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 70) + 'px');
      h.style.setProperty('--s', (0.7 + Math.random() * 0.6).toFixed(2));
      h.style.left = (30 + Math.random() * 24) + 'px';
      h.style.animationDelay = (i * 130) + 'ms';
      body.appendChild(h);
      setTimeout(() => h.remove(), 2000 + i * 130);
    }
  }
  // ---------- level-up / level-down moment ----------
  function levelMoment(L, up, fresh) {
    document.querySelectorAll('.lvlm').forEach(e => e.remove());
    const px = state.settings.petStyle === 'pixel', rnd = Math.floor(Math.random() * 3);
    const cols = ['#f5b83d', '#ff5c8a', '#6ee7a8', '#ffffff', '#ffd27a'];
    const fx = up ? Array.from({ length: 28 }, (_, i) => i % 3 === 0
        ? `<span class="lv-h" style="left:${Math.random() * 100}%;animation-delay:${(Math.random() * 0.8).toFixed(2)}s">${HEART}</span>`
        : `<span class="lv-c" style="left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-delay:${(Math.random() * 0.8).toFixed(2)}s;--r:${Math.round(Math.random() * 720 - 360)}deg"></span>`).join('') : '';
    const el = document.createElement('div');
    el.className = 'lvlm ' + (up ? 'up' : 'down');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', up ? 'Level up' : 'Level down');
    el.innerHTML = `<div class="lv-fx">${fx}</div><div class="lvlm-card">
      ${up ? gifVid(gifRand(['c', 'h', 't']), 'lv-vid') : `<img class="${px ? 'px' : ''}" src="${petSrc('poor', rnd)}" alt="">`}
      <div class="label">${up ? 'Level up' : 'Level down'}</div>
      <h2>Level ${L} · ${titleOf(L)}</h2>
      <p>${up ? 'Huge. Danielle is proud of you.' : 'Back to level ' + L + '. Let’s fight back.'}</p>
      ${up && fresh && fresh.length ? `<div class="lv-unl"><b>Unlocked ${unlockText(fresh)}</b><div>${fresh.slice(0, 6).map(x => `<img src="${x.poster || x.img.replace('/body/', '/body/t/')}" alt="">`).join('')}</div></div>` : ''}
      <button class="btn">${up ? 'Let’s go' : 'Fight back'}</button></div>`;
    document.body.appendChild(el);
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
    el.onclick = close;
    setTimeout(close, up ? (fresh && fresh.length ? 7000 : 5000) : 4000);
    if (up) spawnHearts(6);
  }
  function unlockText(items) {
    const p = items.filter(x => x.img).length, g = items.length - p, parts = [];
    if (p) parts.push(p + ' photo' + (p > 1 ? 's' : '')); if (g) parts.push(g + ' GIF' + (g > 1 ? 's' : ''));
    return parts.join(' and ');
  }
  function bigWin(title, types) {
    if (!state.settings.showDanielle) return;
    document.querySelectorAll('.bigwin').forEach(e => e.remove());
    const el = document.createElement('div');
    el.className = 'bigwin'; el.setAttribute('role', 'status');
    el.innerHTML = `${gifVid(gifRand(types), 'bw-vid')}<b>${esc(title)}</b>`;
    document.body.appendChild(el);
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
    el.onclick = close; setTimeout(close, 2800); spawnHearts(4);
  }
  // ---------- undo bar ----------
  let undoTimer = null;
  function showUndo(label, diff, undoFn) {
    document.querySelectorAll('.undo').forEach(e => e.remove());
    clearTimeout(undoTimer);
    const el = document.createElement('div');
    el.className = 'undo';
    el.innerHTML = `<span>${esc(label)}${diff ? ` <b class="${cls(diff)}">${sign(diff)} XP</b>` : ''}</span><button>Undo</button><i></i>`;
    document.body.appendChild(el);
    const kill = () => { clearTimeout(undoTimer); el.classList.add('out'); setTimeout(() => el.remove(), 200); };
    el.querySelector('button').onclick = () => { kill(); undoFn(); };
    undoTimer = setTimeout(kill, 5000);
  }

  function react(diff, zeroMsg) {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const tier = diff < 0 ? 'poor' : diff > 0 ? 'great' : null;
    const say = diff > 0 ? pick(SAY_GOOD) + sign(diff) + ' XP' : diff < 0 ? pick(SAY_BAD) + sign(diff) + ' XP' : (zeroMsg || 'Logged.');
    walkerReact(tier, Math.floor(Math.random() * 3), say, diff);
    if (diff > 0) spawnHearts(Math.min(7, 3 + Math.floor(diff / 15)));
  }

  // ---------- walking Danielle (every tab) ----------
  const SHUF_ICON = '<path d="M3 7h3.5c2 0 3.2 1 4.3 2.6l2.4 4.8c1.1 1.6 2.3 2.6 4.3 2.6H21M3 17h3.5c1.4 0 2.4-.5 3.3-1.4M13.2 8.4c.9-.9 1.9-1.4 3.3-1.4H21M18 4l3 3-3 3M18 14l3 3-3 3"/>';
  const PIX = t => [1, 2, 3].map(i => `./stickers/pixel/${t}${i}.png`);
  function petSrc(tier, seed) {
    const a = state.settings.petStyle === 'pixel' ? PIX(tier) : STICKERS[tier].imgs;
    return a[((seed || 0) % a.length + a.length) % a.length];
  }
  const ORBS = [['feed', 'Feed', '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 1.5-3 4-3 7h3v11"/>'],
    ['ex', 'Exercise', '<path d="M6.5 6.5l11 11M4 10l6-6M14 20l6-6M2.5 11.5l2 2M19.5 10.5l2 2"/>'],
    ['steps', 'Steps', '<path d="M8 15c-2 0-3-2-3-5s1-6 3-6 3 3 3 6-1 5-3 5zM5.5 18a2.5 2.5 0 0 0 5 0M16 11c2 0 3 2 3 5s-1 4-3 4-3-1-3-4 1-5 3-5z"/>'],
    ['weight', 'Weigh-in', '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9.5a4 4 0 0 1 6 0l-2 2.5"/>'],
    ['daily', 'Water', '<path d="M12 3.5c3 3.6 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.9 6-10.5z"/>'],
    ['shuffle', 'Shuffle', SHUF_ICON]];
  const WK = { quietUntil: 0, el: null, x: 30, dir: 1, mode: 'idle', until: 0, last: 0, ring: false, rx: null, rxUntil: 0, sayUntil: 0, nextSay: 0, nextHeart: 0, nextM: 0, m: null, sleep: false, low: false };
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function walkerInit() {
    const el = document.createElement('div');
    el.id = 'walker'; el.className = 'walker';
    el.innerHTML = `<div class="wk-meters" id="wk-meters"></div><div class="wk-say" id="wk-say" aria-live="polite"></div>
      <div class="wk-body" id="wk-body">
        ${ORBS.map((o, i) => `<button class="orb o${i}" data-worb="${o[0]}" tabindex="-1"><svg viewBox="0 0 24 24">${o[2]}</svg><span>${o[1]}</span></button>`).join('')}
        <button class="wk-btn" id="wk-btn" aria-label="Danielle. Tap to log food, exercise, steps, weight or water" aria-expanded="false"><img id="wk-img" alt="Danielle"></button>
        <span class="float" id="wk-float"></span>
        <span class="wk-sweat" aria-hidden="true"></span>
        <span class="wk-zz" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span>
      </div>`;
    document.body.appendChild(el);
    WK.el = el;
    el.querySelector('#wk-btn').onclick = () => walkerRing(!WK.ring);
    el.querySelectorAll('[data-worb]').forEach(b => b.onclick = () => {
      walkerRing(false);
      if (b.dataset.worb === 'shuffle') { petShuffle(); return; }
      if (ui.tab !== 'today') ui.date = todayStr();
      openSheet(b.dataset.worb);
    });
    document.addEventListener('pointerdown', e => { if (WK.ring && !el.contains(e.target)) walkerRing(false); });
    WK.nextSay = performance.now() + 1200;
    let scT = null;
    window.addEventListener('scroll', () => { el.classList.add('scrolling'); WK.quietUntil = performance.now() + 1500; clearTimeout(scT); scT = setTimeout(() => el.classList.remove('scrolling'), 900); }, { passive: true });
    walkerUpdate();
    requestAnimationFrame(walkerTick);
  }
  function petShuffle() {
    const cur = WK.el.querySelector('#wk-img').getAttribute('src'), all = [];
    for (const tier of ['poor', 'okay', 'great']) for (let i = 0; i < 3; i++) if (petSrc(tier, i) !== cur) all.push({ tier, i });
    const pick = all[Math.floor(Math.random() * all.length)];
    fun().pet = { date: todayStr(), tier: pick.tier, i: pick.i };
    save();
    WK.rx = null; walkerUpdate();
    WK.el.classList.remove('happy', 'sad'); void WK.el.offsetWidth; WK.el.classList.add('happy');
    setTimeout(() => WK.el.classList.remove('happy'), 1700);
    WK.mode = 'idle'; WK.until = performance.now() + 1800;
    showSay('New look.', 3500); spawnHearts(3);
  }
  function walkerRing(open) {
    if (!WK.el) return;
    WK.ring = open;
    WK.el.classList.toggle('open', open);
    WK.el.querySelector('#wk-btn').setAttribute('aria-expanded', open ? 'true' : 'false');
    WK.el.querySelectorAll('.orb').forEach(o => o.tabIndex = open ? 0 : -1);
    if (open) { WK.mode = 'idle'; WK.until = Infinity; hideSay(); }
    else WK.until = 0;
  }
  function moodTier() {
    const r = compute(), dr = r.days[todayStr()];
    return { tier: dr ? tierOf(dr.delta) : 'okay', dr, net: dr ? dr.delta : 0 };
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const mins = tt => +tt.slice(0, 2) * 60 + +tt.slice(3, 5);
  // In-app reminders: time-based nudges, returned first when relevant
  function reminderLine() {
    const s = state.settings, d = state.days[todayStr()] || {}, nm = mins(nowTime()), we = mins(s.windowEnd), ws = mins(s.windowStart);
    const out = [];
    if (nm < 11 * 60 && d.weight == null) out.push('Morning. Weigh-in before breakfast?', 'Scale first, then breakfast.');
    if (nm < 13 * 60 && d.sleep == null) out.push('How many hours did you sleep?', 'Log your sleep for energy points.');
    if (nm >= we - 45 && nm < we) out.push('Kitchen closes at ' + s.windowEnd + '. Last healthy bite?', (we - nm) + ' minutes until the kitchen closes.');
    if (nm >= 19 * 60 && (d.water || 0) < s.waterTarget && !waterOK(state.days[todayStr()])) out.push('Water check: ' + Math.ceil((s.waterTarget - (d.water || 0)) / 250) + ' glasses to go.');
    if (nm >= 20 * 60 && (d.steps == null)) out.push('Don’t forget to log your steps tonight.');
    if (nm >= ws && nm < ws + 60) out.push('Kitchen’s open. Start with something healthy?');
    return out.length ? pick(out) : null;
  }
  function idleLine() {
    const { tier, dr, net } = moodTier(), s = state.settings, ds = todayStr(), d = state.days[ds] || { events: [], steps: null, weight: null };
    const m = WK.m || meters(), h = new Date().getHours(), r = compute(), f = dayFlags(d, s);
    if (!m.awake) return pick(['Kitchen’s closed. Zz', 'Zz… see you in the morning.', 'Sleepy. Log your sleep tomorrow.', 'Zz… dreaming about boxing.', 'Night. Good sleep counts for points.']);
    if (Math.random() < 0.45) { const rl = reminderLine(); if (rl) return rl; }
    const L = [];
    // time of day
    if (h < 11) L.push('Good morning.', 'New day, new points.', 'Breakfast idea: eggs and fruit.', 'Morning walk? Steps add up.');
    else if (h < 14) L.push('Lunch time soon. Healthy one?', 'Halfway through the day. How are we doing?', 'Midday walk with me?');
    else if (h < 18) L.push('Afternoon slump? Drink some water.', 'Snack check: something healthy.', 'Good time for a workout.');
    else L.push('Evening. Let’s finish strong.', 'Dinner: something healthy?', 'Evening walk to close your steps?');
    // mood / score
    if (!dr) L.push('Hi. Tap me to log your day.', 'Feed me?', 'Ready for boxing?', 'Nothing logged yet. Let’s start.');
    else if (tier === 'great') L.push('Huge day. Keep it going.', 'You’re on fire today.', 'This is a great day.', 'Love this energy.');
    else if (tier === 'okay') L.push(`${s.stickerGreat - net} more points for a huge day.`, 'Solid so far. Workout?', 'Nearly a huge day.');
    else L.push('Rough one. Feed me something healthy?', 'Let’s turn it around.', 'One good meal changes the day.');
    // quests
    if (ds >= BONUS_FROM) {
      const todo = questsFor(ds).filter(q => !q.done(d, f)), sq = stepQuest(ds), sleft = sq.target - (d.steps || 0);
      if (sleft > 0) L.push(sleft.toLocaleString() + ' steps to today’s ' + sq.target.toLocaleString() + ' goal.');
      const wcq = wcFor(ds), wleft = wcq.target - (d.wc || 0);
      if (wleft > 0) L.push('Challenge: ' + wcq.label + '. ' + wcFmt(wcq, wleft) + ' ' + wcq.unit + ' to go.');
      if (todo.length) { const q = pick(todo); L.push('Quest: ' + q.label(s).toLowerCase() + '.', todo.length + ' quest' + (todo.length > 1 ? 's' : '') + ' left today.'); }
      else if (sleft <= 0 && wleft <= 0) L.push('All quests done. Amazing.');
      const c = comboParts(f, wcDone(ds, d)), miss = [['steps', 'steps'], ['workout', 'a workout'], ['window', 'eating in the window']].filter(([k]) => !c[k]).map(x => x[1]);
      if (miss.length === 1) L.push('Just ' + miss[0] + ' for the 1.5× combo.');
    }
    // steps / food / fuel
    if (d.steps == null || d.steps < s.stepTarget) L.push(d.steps == null ? 'Steps check?' : (s.stepTarget - d.steps).toLocaleString() + ' steps to go.');
    if (f.exercise === 0 && h >= 12) L.push('No workout yet. Boxing?', '30 minutes of anything counts.');
    if (!waterOK(d)) L.push('Water helps. Tap me to add a glass.');
    else L.push('Water target hit. Nice.');
    if (!waterOK(state.days[ds])) L.push('Water break?', 'Sip some water with me.');
    // streaks / freezes / stars / level
    const best = Math.max(r.streaks.steps, r.streaks.window, r.streaks.healthy);
    if (best >= 2) L.push(best + '-day streak. Don’t break it.');
    if (best >= 4 && best < 7) L.push((7 - best) + ' more days for a streak freeze.');
    if (r.freezes) L.push('You have ' + r.freezes + ' streak freeze' + (r.freezes > 1 ? 's' : '') + ' saved.');
    const bal = starBal(r), nextIt = shop().items.filter(i => i.cost > bal).sort((a, b) => a.cost - b.cost)[0];
    if (nextIt) L.push((nextIt.cost - bal).toLocaleString() + ' Stars until ' + nextIt.name.toLowerCase() + '.');
    const affordable = shop().items.filter(i => i.cost <= bal);
    if (affordable.length) L.push('You can afford ' + pick(affordable).name.toLowerCase() + ' in the shop.');
    const x = xpBlock(r); L.push((x.hi - r.xp).toLocaleString() + ' XP to level ' + (x.L + 1) + '.');
    const nxt = DANIELLE.concat(DANI_GIFS).filter(i => i.lv > peakL).reduce((mm, i) => Math.min(mm, i.lv), Infinity);
    if (isFinite(nxt)) L.push('New photos unlock at level ' + nxt + '.');
    // meters
    if (m.full < 25) L.push('I’m hungry. Feed me?', 'Snack time? Something healthy.');
    if (m.energy < 30 && h >= 15) L.push('Low energy. Walk with me?', 'Boxing later?');
    if (m.happy < 35) L.push('Can we have a better day?', 'I’m a bit sad. Log something good?');
    if (m.happy >= 80) L.push('So happy right now.', 'Best day ever?');
    // forecast
    const k = forecast();
    if (k != null && k < -0.005 && s.goalWeight) L.push('Trend is going down. ' + r1(-k * 7) + ' kg a week.');
    // general encouragement
    L.push('Proud of you.', 'Small steps, every day.', 'You’ve got this.', 'Consistency wins.', 'Fighting.');
    return pick(L);
  }
  const TAB_LINES = {
    today: () => pick(['Back to today.', 'What are we logging?', 'Let’s check the quests.']),
    progress: () => { const k = forecast(); return k != null && k < -0.005 ? 'Look at that trend.' : pick(['Progress check.', 'Every kg counts.', 'Add a progress photo?']); },
    history: () => pick(['Look how far you’ve come.', 'Check the collection.', 'Remember the huge days?']),
    settings: () => { const b = starBal(); return b ? b.toLocaleString() + ' Stars to spend.' : pick(['Shop opens with Stars.', 'Set your targets here.']); }
  };
  function showSay(text, ms) {
    const b = WK.el.querySelector('#wk-say');
    b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    WK.sayUntil = performance.now() + (ms || 6000);
  }
  function hideSay() { WK.el.querySelector('#wk-say').classList.remove('show'); WK.sayUntil = 0; }
  function walkerUpdate() {
    if (!WK.el || !state) return;
    const now = performance.now();
    WK.el.classList.toggle('pixel', state.settings.petStyle === 'pixel');
    const img = WK.el.querySelector('#wk-img');
    const sh = state.fun && state.fun.pet && state.fun.pet.date === todayStr() ? state.fun.pet : null;
    const src = WK.rx && now < WK.rxUntil ? petSrc(WK.rx.tier, WK.rx.seed) : sh ? petSrc(sh.tier, sh.i) : petSrc(moodTier().tier, dayIndex(todayStr()));
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    WK.m = meters(); WK.sleep = !WK.m.awake; WK.low = WK.m.happy < 35;
    WK.el.classList.toggle('sleep', WK.sleep);
    WK.el.classList.toggle('low', WK.low);
    WK.el.querySelector('#wk-meters').innerHTML = meterRows(WK.m, true);
  }
  function walkerReact(tier, seed, say, diff) {
    if (!WK.el) return;
    WK.rx = tier ? { tier, seed } : null; WK.rxUntil = performance.now() + 2600;
    WK.el.classList.remove('happy', 'sad'); void WK.el.offsetWidth;
    if (tier) WK.el.classList.add(diff < 0 ? 'sad' : 'happy');
    const f = WK.el.querySelector('#wk-float');
    f.className = 'float'; f.textContent = '';
    if (diff) { void f.offsetWidth; f.textContent = sign(diff); f.className = 'float go ' + cls(diff); }
    WK.mode = 'idle'; WK.until = performance.now() + 2600;
    walkerUpdate(); showSay(say, 5000);
    setTimeout(() => { WK.el.classList.remove('happy', 'sad'); walkerUpdate(); }, 2650);
  }
  function walkerTick(t) {
    const dt = Math.min(64, t - (WK.last || t)); WK.last = t;
    const el = WK.el, app = document.querySelector('.app');
    const ar = app.getBoundingClientRect(), pad = 12;
    el.style.left = ar.left + 'px'; el.style.width = ar.width + 'px';
    const body = el.querySelector('#wk-body');
    const bw = body.offsetWidth || 90;
    const minX = pad, maxX = Math.max(pad, ar.width - bw - pad);
    if (WK.ring) {
      const cx = (ar.width - bw) / 2; WK.x += (cx - WK.x) * Math.min(1, dt / 120);
    } else if (WK.sleep) {
      WK.mode = 'idle';
    } else if (!reduceMotion) {
      if (t > WK.until) {
        const r = Math.random();
        if (r < 0.55) { WK.mode = 'walk'; WK.until = t + 2200 + Math.random() * 3800; if (Math.random() < 0.4) WK.dir *= -1; }
        else if (r < 0.72) { WK.mode = 'hop'; WK.until = t + 700; }
        else { WK.mode = 'idle'; WK.until = t + 1500 + Math.random() * 2500; }
      }
      if (WK.mode === 'walk') {
        WK.x += WK.dir * dt * (WK.low ? 0.026 : 0.045);
        if (WK.x <= minX) { WK.x = minX; WK.dir = 1; } else if (WK.x >= maxX) { WK.x = maxX; WK.dir = -1; }
      }
    }
    WK.x = Math.max(minX, Math.min(maxX, WK.x));
    body.style.transform = `translateX(${Math.round(WK.x)}px)`;
    const mode = WK.ring ? 'idle' : WK.mode;
    if (body.dataset.mode !== mode) body.dataset.mode = mode;
    body.classList.toggle('flip', WK.dir < 0 && !WK.ring);
    const say = el.querySelector('#wk-say');
    if (say.classList.contains('show')) {
      const sw = say.offsetWidth, cx = WK.x + bw / 2;
      say.style.left = Math.round(Math.max(8, Math.min(ar.width - sw - 8, cx - sw / 2))) + 'px';
      if (t > WK.sayUntil) hideSay();
    } else if (!WK.ring && t > WK.nextSay && !document.getElementById('sheet')) {
      if (t > WK.quietUntil) { showSay(idleLine(), 6500); WK.nextSay = t + 9000 + Math.random() * 4000; }
    }
    if (WK.rx && t > WK.rxUntil) { WK.rx = null; walkerUpdate(); }
    if (t > WK.nextM) { WK.nextM = t + 60000; walkerUpdate(); }
    if (WK.m && WK.m.happy >= 70 && !WK.ring && !WK.sleep && t > WK.nextHeart) { WK.nextHeart = t + 2600 + Math.random() * 2400; spawnHearts(1); }
    requestAnimationFrame(walkerTick);
  }

  function closeSheet() { const el = document.getElementById('sheet'); if (el) el.remove(); }
  function openSheet(kind) {
    closeSheet();
    const s = state.settings, P = s.pts, ds = ui.date, isToday = ds === todayStr();
    const d = state.days[ds] || { events: [], steps: null, weight: null };
    const count = t => d.events.filter(e => e.type === t).length;
    const opt = (t, pts) => { const a = ACTIONS[t], n = count(t), done = a.once && n > 0;
      return `<button class="act ${a.good ? 'good' : 'bad'} ${done ? 'done' : ''}" data-act="${t}" ${done ? 'aria-pressed="true"' : ''}><span>${a.label}${n && !a.once ? `<span class="cnt">×${n}</span>` : ''}${done ? '<span class="cnt">done · tap to undo</span>' : ''}</span><span class="pts">${sign(pts)}</span></button>`; };
    let title = '', body = '';
    if (kind === 'feed') {
      title = 'Feed Danielle';
      const t0 = isToday ? nowTime() : '13:00';
      body = `<div class="row"><label class="field" style="flex:0 0 160px"><span>Time</span><input type="time" id="foodtime" value="${t0}"></label><span class="hint" id="winnote"></span></div>
        <div class="grid">${opt('healthy', P.healthy)}${opt('unhealthy', P.unhealthy)}${opt('overate', P.overate)}${opt('alcohol', P.alcohol)}</div>
        <p class="hint" style="margin-top:10px">Window ${s.windowStart}–${s.windowEnd}. Outside it: ${P.outside} each. Healthy meals count up to ${P.healthyMax} a day.</p>`;
    } else if (kind === 'ex') {
      title = 'Exercise with Danielle';
      body = `<div class="grid">${opt('boxing', P.boxing)}${opt('strength', P.strength)}${opt('cardio', P.cardio)}</div>`;
    } else if (kind === 'daily') {
      title = 'Water and daily';
      const wat = d.water || 0, wl = Math.max(0, s.waterTarget - wat);
      body = `<div class="grp" style="margin:0 0 6px">Water today</div>
        <div class="wrow"><b class="num">${+(wat / 1000).toFixed(2)} / ${s.waterTarget / 1000} L</b><span class="hint">${wl ? Math.ceil(wl / 250) + ' glass' + (Math.ceil(wl / 250) > 1 ? 'es' : '') + ' to go' : 'Target hit'}</span></div>
        <div class="fbar w" style="margin:6px 0 10px"><i style="width:${Math.min(100, wat / s.waterTarget * 100)}%"></i></div>
        <div class="quick" style="margin-bottom:16px"><button class="btn ghost" data-wv="-250" aria-label="Minus one glass">−</button><button class="btn" data-wv="250">+1 glass</button><button class="btn ghost" data-wv="500">+2 glasses</button></div>
        <div class="grp" style="margin:0 0 6px">Sleep last night <small style="text-transform:none;letter-spacing:0">${d.sleepSrc === 'health' ? '(from Health, only change if wrong)' : '(fills in from Health)'}</small></div>
        <div class="row"><button class="btn ghost" data-inc="-0.5" aria-label="Minus half an hour">−</button><label class="field"><input type="number" inputmode="decimal" step="0.5" min="0" max="16" id="sh-num" placeholder="Hours" value="${d.sleep != null ? d.sleep : ''}"><span>hours</span></label><button class="btn ghost" data-inc="0.5" aria-label="Plus half an hour">+</button></div>
        <div class="quick">${[6, 7, 7.5, 8, 9].map(n => `<button class="btn ghost" data-set="${n}">${n} h</button>`).join('')}</div>
        <button class="btn" id="sh-save" style="width:100%;margin-top:8px">Save sleep</button>
        <p class="hint" style="margin-top:8px">7–9 h: ${sign(P.sleepGood)}. Under 6 h: ${P.sleepBad}. Clear the box and save to remove it.</p>
        <div class="grid" style="margin-top:14px">${opt('complete', P.complete)}</div>`;
    } else if (kind === 'steps') {
      title = 'Add steps';
      body = `<div class="row"><label class="field"><input type="number" inputmode="numeric" min="0" id="sh-num" placeholder="Step count" value="${d.steps != null ? d.steps : ''}"><span>steps</span></label><button class="btn" id="sh-save">Save</button></div>
        <div class="quick">${[1000, 2500, 5000].map(n => `<button class="btn ghost" data-add="${n}">+${n.toLocaleString()}</button>`).join('')}</div>
        <p class="hint" style="margin-top:10px">Target ${s.stepTarget.toLocaleString()}. Bonus at ${s.stepBonusAt.toLocaleString()}. Enter the day's total, or use + to add to it.</p>`;
    } else if (kind === 'wc') {
      const c = wcFor(ds), v = d.wc || 0;
      title = c.label.charAt(0).toUpperCase() + c.label.slice(1);
      body = `<div class="wrow"><b class="num">${wcFmt(c, v)} / ${wcFmt(c, c.target)} ${c.unit}</b><span class="hint">${v >= c.target ? 'Done. ' + sign(c.pts) : wcFmt(c, c.target - v) + ' to go · ' + sign(c.pts)}</span></div>
        <div class="fbar w" style="margin:6px 0 12px"><i style="width:${Math.min(100, v / c.target * 100)}%"></i></div>
        <div class="quick"><button class="btn ghost" data-wcv="-${c.inc[0]}" aria-label="Minus ${c.inc[0]}">−${c.inc[0]}</button><button class="btn" data-wcv="${c.inc[0]}">+${c.inc[0]}</button><button class="btn" data-wcv="${c.inc[1]}">+${c.inc[1]}</button><button class="btn ghost" data-wcv="${c.target}">Done all</button></div>
        <p class="hint" style="margin-top:10px">Today's workout challenge. A new one is picked each day, worth +15 to +35 depending on how hard it is. Finishing it counts as a workout for the combo.${c.k === 'run' ? ' Finishing the run also logs Other cardio 30 min, so you don’t need to log it again.' : ''}</p>`;
    } else if (kind === 'weight') {
      title = 'Weigh-in';
      const last = d.weight != null ? d.weight : (Object.keys(state.days).filter(k => k < ds && state.days[k].weight != null).sort().map(k => state.days[k].weight).pop() || '');
      body = `<div class="row"><button class="btn ghost" data-inc="-0.1" aria-label="Minus 0.1 kg">−</button><label class="field"><input type="number" inputmode="decimal" step="0.1" min="0" id="sh-num" placeholder="Weight" value="${last}"><span>kg</span></label><button class="btn ghost" data-inc="0.1" aria-label="Plus 0.1 kg">+</button></div>
        <button class="btn" id="sh-save" style="width:100%;margin-top:4px">Save weigh-in</button>
        <p class="hint" style="margin-top:10px">${d.weight != null ? 'Saved today: ' + d.weight + ' kg. Clear the box and save to remove it.' : 'Prefilled with your last weigh-in.'}</p>`;
    }
    const el = document.createElement('div');
    el.id = 'sheet'; el.className = 'sheet';
    el.innerHTML = `<div class="sheet-card" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-head"><img src="${stSrc('okay', dayIndex(ds) + 1)}" alt="" class="sheet-st"><h2>${esc(title)}</h2><button class="x" id="sh-x" aria-label="Close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      ${body}</div>`;
    document.body.appendChild(el);
    el.onclick = e => { if (e.target === el) closeSheet(); };
    el.querySelector('#sh-x').onclick = closeSheet;
    const ft = el.querySelector('#foodtime');
    if (ft) { const upd = () => { el.querySelector('#winnote').textContent = inWindow(ft.value || nowTime(), s) ? 'Inside your eating window.' : 'Outside your eating window.'; el.querySelector('#winnote').className = 'hint ' + (inWindow(ft.value || nowTime(), s) ? '' : 'bad'); }; ft.oninput = upd; upd(); }
    const doLog = (fn, label, zeroMsg) => {
      const snap = JSON.stringify(state.days[ds] || null), sw = state.settings.startWeight;
      const diff = commit(fn, true);
      react(diff, zeroMsg);
      showUndo(label, diff, () => {
        const d2 = commit(() => { if (snap === 'null') delete state.days[ds]; else state.days[ds] = JSON.parse(snap); state.settings.startWeight = sw; }, true, true);
        walkerReact(null, 0, 'Undone.' + (d2 ? ' ' + sign(d2) + ' XP' : ''), d2);
      });
    };
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const t = b.dataset.act, a = ACTIONS[t];
      closeSheet();
      if (a.once && count(t)) { doLog(() => { const dd = day(ds); dd.events = dd.events.filter(e => e.type !== t); }, 'Removed ' + a.label, 'Undone.'); return; }
      const time = a.group === 'food' ? ((ft && ft.value) || nowTime()) : (isToday ? nowTime() : '12:00');
      doLog(() => day(ds).events.push({ id: uid(), type: t, time }), a.label, a.group === 'food' && t === 'healthy' ? 'Logged. Healthy meal cap reached for today.' : 'Logged.');
    });
    el.querySelectorAll('[data-wcv]').forEach(b => b.onclick = () => {
      const c = wcFor(ds), cur = (state.days[ds] && state.days[ds].wc) || 0, v = +b.dataset.wcv;
      const nv = +Math.max(0, Math.min(c.target * 3, b.dataset.wcv == c.target ? Math.max(cur, c.target) : cur + v)).toFixed(1);
      if (nv === cur) return;
      const hit = cur < c.target && nv >= c.target;
      const diff = commit(() => {
        const dd = day(ds); dd.wc = nv;
        if (c.k === 'run') {
          const auto = dd.events.findIndex(e => e.auto === 'wc');
          if (nv >= c.target && auto < 0 && !dd.events.some(e => e.type === 'cardio')) dd.events.push({ id: uid(), type: 'cardio', time: isToday ? nowTime() : '18:00', auto: 'wc' });
          else if (nv < c.target && auto >= 0) dd.events.splice(auto, 1);
        }
      }, true);
      react(diff, hit ? (c.k === 'run' ? 'Run done. Cardio logged too.' : 'Challenge done.') : nv < c.target ? wcFmt(c, c.target - nv) + ' ' + c.unit + ' to go.' : 'Extra credit.');
      if (hit) toast('Challenge done ' + sign(c.pts), 'pos');
      openSheet('wc');
    });
    el.querySelectorAll('[data-wv]').forEach(b => b.onclick = () => {
      const cur = (state.days[ds] && state.days[ds].water) || 0, v = +b.dataset.wv;
      if (cur + v < 0) return;
      const hit = cur < s.waterTarget && cur + v >= s.waterTarget;
      const diff = commit(() => { day(ds).water = cur + v; }, true);
      const left = Math.max(0, s.waterTarget - cur - v);
      react(diff, left ? Math.ceil(left / 250) + ' more glass' + (Math.ceil(left / 250) > 1 ? 'es' : '') + ' to go.' : 'Water target hit.');
      if (hit) toast('Water target hit', 'pos');
      openSheet('daily');
    });
    const num = el.querySelector('#sh-num');
    el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { num.value = (+num.value || 0) + +b.dataset.add; });
    el.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { num.value = r1(Math.max(0, (+num.value || 0) + +b.dataset.inc)); });
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { num.value = b.dataset.set; });
    const sv = el.querySelector('#sh-save');
    if (sv) {
      sv.onclick = () => {
        const v = num.value.trim(); closeSheet();
        if (kind === 'daily') doLog(() => { const dd = day(ds); dd.sleep = v === '' ? null : Math.max(0, Math.min(16, r1(+v))); delete dd.sleepSrc; }, v === '' ? 'Sleep cleared' : 'Slept ' + r1(+v) + ' h', 'Sleep saved.');
        else if (kind === 'steps') doLog(() => { const dd = day(ds); dd.steps = v === '' ? null : Math.max(0, Math.round(+v)); delete dd.stepsSrc; }, v === '' ? 'Steps cleared' : (+v).toLocaleString() + ' steps', 'Steps saved.');
        else doLog(() => { const w = v === '' ? null : r1(+v); day(ds).weight = w; if (w && !state.settings.startWeight) state.settings.startWeight = w; }, v === '' ? 'Weigh-in cleared' : 'Weigh-in ' + r1(+v) + ' kg', 'Weigh-in saved.');
      };
      num.addEventListener('keydown', e => { if (e.key === 'Enter') sv.click(); });
      if (kind !== 'daily') setTimeout(() => num.focus(), 50);
    }
  }

  const SNOW = '<svg class="snow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"/></svg>';
  function frzChip(r) { return `<span class="chip frz ${r.freezes ? 'on' : ''}" title="Streak freezes">${SNOW} <b class="num">${r.freezes}</b>/2 freeze${r.freezes === 1 ? '' : 's'}</span>`; }
  function chip(label, n) {
    const m = mult(n);
    return `<span class="chip ${n >= 3 ? 'hot' : ''}">${label} <b class="num">${n}</b> day${n === 1 ? '' : 's'}${m > 1 ? ' · ×' + m : ''}</span>`;
  }

  function renderProgress() {
    const s = state.settings, r = compute(), today = todayStr();
    const keys = Object.keys(state.days).filter(k => state.days[k].weight != null && k <= today).sort();
    const avgNow = avg7(today) ?? (keys.length ? avg7(keys[keys.length - 1]) : null);
    const start = s.startWeight, goal = s.goalWeight;
    let pct = 0;
    if (start && goal && avgNow != null && start > goal) pct = Math.max(0, Math.min(100, (start - avgNow) / (start - goal) * 100));
    const lost = start && avgNow != null ? r1(start - avgNow) : null;

    const badgeDefs = [];
    for (let i = 1; i <= Math.max(5, (r.kgHeld || 0) + 2); i++) badgeDefs.push({ k: 'kg' + i, ic: i + ' kg', name: 'Lost ' + i + ' kg' });
    for (let i = 1; i <= Math.max(3, (r.pctHeld || 0) + 1); i++) badgeDefs.push({ k: 'pct' + i, ic: (i * 5) + '%', name: (i * 5) + '% body weight' });
    badgeDefs.push({ k: 'goal', ic: 'Goal', name: 'Goal weight' });

    view().innerHTML = `
      <div class="datenav"><div><h1>Progress</h1><div class="sub">Based on your 7-day average weight</div></div>${dmFace(1)}</div>
      ${renderToday(true)}
      <section class="card">
        <div class="goal-num">
          <div><div class="label">Current avg</div><b class="num">${avgNow != null ? r1(avgNow) + ' kg' : '—'}</b></div>
          <div style="text-align:right"><div class="label">Goal</div><b class="num" style="color:var(--plus)">${goal ? goal + ' kg' : '—'}</b></div>
        </div>
        <div class="goalbar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
        <div class="xpmeta" style="margin-top:6px"><span>Start ${start ? start + ' kg' : 'not set'}</span><span>${Math.round(pct)}% of the way</span></div>
        <div class="stats">
          <div class="stat"><b class="num">${lost != null ? (lost > 0 ? '−' : '+') + Math.abs(lost) : '—'}</b><span>kg vs start</span></div>
          <div class="stat"><b class="num">${start && goal && avgNow != null ? Math.max(0, r1(avgNow - goal)) : '—'}</b><span>kg to goal</span></div>
          <div class="stat"><b class="num">${r.xp.toLocaleString()}</b><span>total XP</span></div>
        </div>
        ${!start || !goal ? `<p class="hint warn" style="margin-top:12px">Add your start and goal weight in Rules.</p>` : ''}
      </section>
      ${forecastCard(avgNow, goal)}
      <section class="card">
        <h2>Weight trend <small>dots = weigh-ins · line = 7-day avg</small></h2>
        ${keys.length ? '<div class="chartbox"><canvas id="wchart" aria-label="Weight chart"></canvas></div>' : '<p class="empty">Log a weigh-in on the Today screen to start your chart.</p>'}
      </section>
      <section class="card">
        <h2>Badges <small>kept even if you drop a level</small></h2>
        <div class="badges">${badgeDefs.map(b => `<div class="badge ${r.badges[b.k] ? 'on' : ''}"><span class="ic">${b.ic}</span>${b.name}${r.badges[b.k] ? `<br><span style="color:var(--muted)">${fmtDate(r.badges[b.k], { day: 'numeric', month: 'short' })}</span>` : ''}</div>`).join('')}</div>
      </section>
      <section class="card">
        <h2>Weekly check <small>Sundays</small></h2>
        ${r.weekly.length ? `<ul class="lines weeklist">${r.weekly.slice().reverse().map(w => `<li><span>Week ending ${fmtDate(w.date, { day: 'numeric', month: 'short' })}<span class="meta">avg ${r1(w.avg)} kg</span></span><span class="p ${w.diff == null ? 'zero' : w.diff > s.trendTolerance ? 'neg' : 'pos'}">${w.diff == null ? 'first' : (w.diff > 0 ? '+' : '') + r1(w.diff) + ' kg'}</span></li>`).join('')}</ul>` : '<p class="empty">Your first weekly comparison appears after two Sundays with weigh-ins.</p>'}
      </section>
      ${sleepCard()}
      ${rhrCard()}
      ${ppCard()}`;
    ppBind();
    sleepChart();
    rhrChart();
    const sa = document.getElementById('sl-add'); if (sa) sa.onclick = () => { walkerRing(false); ui.date = todayStr(); openSheet('daily'); };

    if (keys.length && window.Chart) {
      const first = keys[0];
      const labels = [], pts = [], avgs = [];
      for (let ds = first; ds <= today; ds = addDays(ds, 1)) {
        labels.push(fmtDate(ds, { day: 'numeric', month: 'short' }));
        const d = state.days[ds]; pts.push(d && d.weight != null ? d.weight : null);
        avgs.push(avg7(ds) != null ? r1(avg7(ds)) : null);
      }
      const ctx = document.getElementById('wchart');
      if (chart) chart.destroy();
      const ds = [
        { type: 'line', label: '7-day avg', data: avgs, borderColor: cssv('--gold'), borderWidth: 2.5, pointRadius: 0, tension: .3, spanGaps: true },
        { type: 'scatter', label: 'Weigh-in', data: pts, backgroundColor: cssv('--muted'), pointRadius: 3.5 }
      ];
      if (goal) ds.push({ type: 'line', label: 'Goal', data: labels.map(() => goal), borderColor: cssv('--plus'), borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0 });
      chart = new Chart(ctx, {
        data: { labels, datasets: ds },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: { legend: { labels: { color: cssv('--muted'), boxWidth: 10, font: { size: 12 } } } },
          scales: {
            x: { ticks: { color: cssv('--faint'), maxTicksLimit: 6, font: { size: 11 } }, grid: { display: false } },
            y: { ticks: { color: cssv('--faint'), font: { size: 11 } }, grid: { color: cssv('--line') } }
          }
        }
      });
    }
  }

  let rchart = null, schart = null;
  function sleepKeys() { const t = todayStr(), out = []; for (let i = 29; i >= 0; i--) { const ds = addDays(t, -i); if (state.days[ds] && state.days[ds].sleep != null) out.push(ds); } return out; }
  function sleepCard() {
    const k = sleepKeys(), t = todayStr(), sl = ds => state.days[ds] && state.days[ds].sleep;
    const last = k.length ? k[k.length - 1] : null;
    const wk = []; for (let i = 0; i < 7; i++) { const v = sl(addDays(t, -i)); if (v != null) wk.push(v); }
    const avg = wk.length ? r1(wk.reduce((a, b) => a + b, 0) / wk.length) : null, good = wk.filter(v => v >= 7 && v <= 9).length;
    const lastLbl = last ? (last === t ? 'last night' : 'night before ' + fmtDate(last, { day: 'numeric', month: 'short' })) : '';
    return `<section class="card"><h2>Sleep <small>${k.some(x => state.days[x].sleepSrc === 'health') ? 'from Health' : 'last 30 days'}</small></h2>
      <div class="stats" style="margin-top:0">
        <div class="stat"><b class="num">${last ? sl(last) + ' h' : '—'}</b><span>${last ? lastLbl : 'no sleep yet'}</span></div>
        <div class="stat"><b class="num">${avg != null ? avg + ' h' : '—'}</b><span>7-day average</span></div>
        <div class="stat"><b class="num">${good}/7</b><span>nights 7–9 h</span></div>
      </div>
      ${k.length >= 2 ? '<div class="chartbox" style="height:170px;margin-top:12px"><canvas id="schart"></canvas></div>' : ''}
      <button class="btn ghost" id="sl-add" style="width:100%;margin-top:12px">Add or edit last night</button></section>`;
  }
  function sleepChart() {
    if (schart) { schart.destroy(); schart = null; }
    const el = document.getElementById('schart'); if (!el || !window.Chart) return;
    const k = sleepKeys(), v = k.map(x => state.days[x].sleep);
    schart = new Chart(el, { type: 'bar', data: { labels: k.map(x => fmtDate(x, { day: 'numeric', month: 'short' })), datasets: [{ label: 'hours', data: v, backgroundColor: v.map(h => h < 6 ? '#e2533f' : h >= 7 && h <= 9 ? '#1d9a63' : '#8f7ae6'), borderRadius: 4, maxBarThickness: 18 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: cssv('--faint'), maxTicksLimit: 6, font: { size: 11 } }, grid: { display: false } }, y: { min: 0, suggestedMax: 9, ticks: { color: cssv('--faint'), font: { size: 11 }, stepSize: 2 }, grid: { color: cssv('--line') } } } } });
  }
  function rhrKeys() { return Object.keys(state.days).filter(k => state.days[k].rhr != null).sort().slice(-60); }
  function rhrCard() {
    const k = rhrKeys(); if (!k.length) return '';
    const lastV = state.days[k[k.length - 1]].rhr, b = rhrBase(todayStr());
    return `<section class="card"><h2>Resting heart rate <small>from Health</small></h2>
      <p class="hint" style="margin-top:0">Latest ${lastV} bpm${b != null ? ' · 30-day average ' + Math.round(b) + ' bpm' : ''}. Lower usually means fitter.</p>
      ${k.length >= 2 ? '<div class="chartbox" style="height:170px"><canvas id="rchart"></canvas></div>' : ''}</section>`;
  }
  function rhrChart() {
    if (rchart) { rchart.destroy(); rchart = null; }
    const el = document.getElementById('rchart'); if (!el || !window.Chart) return;
    const k = rhrKeys();
    rchart = new Chart(el, { type: 'line', data: { labels: k.map(x => fmtDate(x, { day: 'numeric', month: 'short' })), datasets: [{ label: 'bpm', data: k.map(x => state.days[x].rhr), borderColor: '#e2533f', backgroundColor: '#e2533f', borderWidth: 2, pointRadius: 2.5, tension: .3 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: cssv('--faint'), maxTicksLimit: 6, font: { size: 11 } }, grid: { display: false } }, y: { ticks: { color: cssv('--faint'), font: { size: 11 }, precision: 0 }, grid: { color: cssv('--line') } } } } });
  }
  // ---------- goal forecast ----------
  function forecast() {
    const today = todayStr(), pts = [];
    for (let i = 20; i >= 0; i--) { const ds = addDays(today, -i), d = state.days[ds]; if (d && d.weight != null) { const a = avg7(ds); if (a != null) pts.push([20 - i, a]); } }
    if (pts.length < 5 || pts[pts.length - 1][0] - pts[0][0] < 6) return null;
    const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
    const sxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0), sxx = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
    return sxx ? sxy / sxx : null; // kg per day
  }
  function forecastCard(avgNow, goal) {
    let body;
    const k = forecast();
    if (!goal) body = 'Set a goal weight in Rules to see when you’ll get there.';
    else if (avgNow != null && avgNow <= goal) body = '<b>You’re at your goal.</b> Stay inside your maintenance band to keep earning points.';
    else if (k == null) body = 'Log weigh-ins on at least 5 days across a week to see your forecast.';
    else if (k > -0.005) body = `Your trend is flat or going up right now (${k > 0 ? '+' : ''}${r1(k * 7)} kg a week). A few good days will get it moving again.`;
    else {
      const days = Math.ceil((avgNow - goal) / -k), when = addDays(todayStr(), days);
      body = `At this pace (${r1(k * 7)} kg a week) you’ll reach <b>${goal} kg around ${esc(fmtDate(when, { day: 'numeric', month: 'long', year: 'numeric' }))}</b>.` + (days > 730 ? ' That’s a long way off, so a steeper trend will bring it closer.' : '');
    }
    return `<section class="card forecast"><h2>Goal forecast <small>last 3 weeks</small></h2><p>${body}</p></section>`;
  }

  // ---------- private progress photos (stored on the app's server) ----------
  const PP = { list: null, loading: false, pose: 'front', a: null, b: null };
  async function ppLoad() {
    if (!API || PP.loading) return; PP.loading = true;
    try { const j = await (await fetch(API + '/api/photos', { headers: AH })).json(); PP.list = j.photos || []; } catch (e) { PP.list = PP.list || []; }
    PP.loading = false; if (ui.tab === 'progress') render();
  }
  const ppSrc = id => API + '/api/photos/' + id + (AK ? '?k=' + encodeURIComponent(AK) : '');
  const POSES = [['front', 'Front'], ['side', 'Side'], ['back', 'Back']];
  function ppCard() {
    if (!API) return '';
    if (PP.list == null) { ppLoad(); return `<section class="card"><h2>Progress photos</h2><p class="empty">Loading…</p></section>`; }
    const L = PP.list.slice().sort((x, y) => x.date.localeCompare(y.date));
    const opts = sel => L.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(fmtDate(p.date, { day: 'numeric', month: 'short', year: '2-digit' }))} · ${p.pose}</option>`).join('');
    if (L.length >= 2) {
      if (!PP.a || !L.some(p => p.id === PP.a)) PP.a = L[0].id;
      if (!PP.b || !L.some(p => p.id === PP.b)) PP.b = L[L.length - 1].id;
    }
    const byDate = {}; L.slice().reverse().forEach(p => (byDate[p.date] = byDate[p.date] || []).push(p));
    return `<section class="card pp">
      <h2>Progress photos <small>private</small></h2>
      <div class="seg pose" role="radiogroup" aria-label="Pose">${POSES.map(([k, l]) => `<button role="radio" data-pose="${k}" aria-checked="${PP.pose === k}">${l}</button>`).join('')}</div>
      <div class="row" style="margin-top:8px"><label class="field" style="flex:1"><span>Date</span><input type="date" id="pp-date" value="${todayStr()}" max="${todayStr()}"></label>
        <label class="btn" for="pp-file" style="flex:0 0 auto">Add photo</label><input type="file" id="pp-file" accept="image/*" hidden></div>
      <p class="hint" id="pp-msg">Stored privately on your app’s server, not in the public site files.</p>
      ${L.length >= 2 ? `<div class="grp" style="margin-top:12px">Compare</div>
        <div class="pp-cmp"><div><select id="pp-a" aria-label="First photo">${opts(PP.a)}</select><img src="${ppSrc(PP.a)}" alt="Progress photo"></div><div><select id="pp-b" aria-label="Second photo">${opts(PP.b)}</select><img src="${ppSrc(PP.b)}" alt="Progress photo"></div></div>` : ''}
      ${L.length ? `<div class="grp" style="margin-top:12px">All photos</div>${Object.entries(byDate).map(([dt, ps]) => `<div class="pp-day"><span>${esc(fmtDate(dt, { day: 'numeric', month: 'short', year: 'numeric' }))}</span><div class="pp-grid">${ps.map(p => `<button data-pp="${p.id}" aria-label="Open ${p.pose} photo"><img src="${ppSrc(p.id)}" alt="" loading="lazy"><i>${p.pose}</i></button>`).join('')}</div></div>`).join('')}` : '<p class="empty" style="padding-top:6px">No photos yet. Front, side and back every 2–4 weeks works well.</p>'}
    </section>`;
  }
  function ppResize(file) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1280, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that image')); };
      img.src = url;
    });
  }
  function ppBind() {
    view().querySelectorAll('[data-pose]').forEach(b => b.onclick = () => { PP.pose = b.dataset.pose; view().querySelectorAll('[data-pose]').forEach(x => x.setAttribute('aria-checked', x === b)); });
    const fi = document.getElementById('pp-file');
    if (fi) fi.onchange = async () => {
      const f = fi.files && fi.files[0]; if (!f) return;
      const msg = document.getElementById('pp-msg'); msg.textContent = 'Uploading…';
      try {
        const data = await ppResize(f), date = document.getElementById('pp-date').value || todayStr();
        const r = await fetch(API + '/api/photos', { method: 'POST', headers: { 'Content-Type': 'application/json', ...AH }, body: JSON.stringify({ date, pose: PP.pose, data }) });
        if (!r.ok) throw new Error(r.status);
        const j = await r.json(); PP.list.push({ id: j.id, date, pose: PP.pose }); PP.b = j.id;
        toast('Photo saved', 'pos'); walkerReact('great', 1, 'Looking strong.', 0); render();
      } catch (e) { msg.textContent = 'Upload failed. Try again.'; }
    };
    const a = document.getElementById('pp-a'), b = document.getElementById('pp-b');
    if (a) a.onchange = () => { PP.a = a.value; render(); };
    if (b) b.onchange = () => { PP.b = b.value; render(); };
    view().querySelectorAll('[data-pp]').forEach(btn => btn.onclick = () => ppView(btn.dataset.pp));
  }
  function ppView(id) {
    const p = PP.list.find(x => x.id === id); if (!p) return;
    lightbox(`<img src="${ppSrc(id)}" alt="Progress photo"><div class="lb-meta"><span>${esc(fmtDate(p.date, { day: 'numeric', month: 'long', year: 'numeric' }))} · ${p.pose}</span><button class="btn danger sm" id="lb-del">Delete</button></div>`, el => {
      el.querySelector('#lb-del').onclick = async e => {
        e.stopPropagation();
        if (!(await confirmBox('Delete this progress photo? This cannot be undone.'))) return;
        try { await fetch(API + '/api/photos/' + id, { method: 'DELETE', headers: AH }); PP.list = PP.list.filter(x => x.id !== id); el.remove(); toast('Photo deleted', 'neg'); render(); } catch (err) { toast('Could not delete', 'neg'); }
      };
    });
  }
  function lightbox(html, bind) {
    document.querySelectorAll('.lb').forEach(e => e.remove());
    const el = document.createElement('div'); el.className = 'lb'; el.setAttribute('role', 'dialog');
    el.innerHTML = `<div class="lb-card">${html}</div><button class="lb-x" aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
    document.body.appendChild(el);
    el.onclick = e => { if (e.target === el || e.target.closest('.lb-x')) el.remove(); };
    bind && bind(el);
    return el;
  }

  function scoreColor(n) {
    if (n == null) return 'var(--surface-2)';
    if (document.documentElement.dataset.theme === 'sunflower') {
      if (n >= 80) return '#5ccf94'; if (n >= 40) return '#9fe3bf'; if (n > 0) return '#d3f3e2';
      if (n === 0) return cssv('--surface-3'); if (n > -25) return '#ffc9bf'; return '#ff9583';
    }
    if (n >= 80) return '#2f7a48'; if (n >= 40) return '#25583a'; if (n > 0) return '#1f3a28';
    if (n === 0) return cssv('--surface-3'); if (n > -25) return '#4a221c'; return '#7a2a20';
  }

  function renderHistory() {
    const r = compute(), today = todayStr();
    if (!ui.calMonth) ui.calMonth = today.slice(0, 7);
    const [y, m] = ui.calMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1), daysIn = new Date(y, m, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    let cells = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < lead; i++) cells += '<div></div>';
    for (let i = 1; i <= daysIn; i++) {
      const ds = y + '-' + pad(m) + '-' + pad(i), dr = r.days[ds], fut = ds > today;
      cells += `<button class="${fut ? 'future' : ''} ${ds === today ? 'today' : ''}" ${fut ? 'disabled' : `data-day="${ds}"`} style="background:${fut ? '' : scoreColor(dr ? dr.delta : null)}" aria-label="${fmtDate(ds)}${dr ? ', ' + sign(dr.delta) + ' XP, ' + STICKERS[tierOf(dr.delta)].name : ''}"><span class="dn">${i}</span>${dr ? stickerImg(dr.delta, 40, 'cal-st', ds) : ''}</button>`;
    }
    const monthName = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const recent = Object.keys(r.days).sort().reverse().slice(0, 10);
    const thisMonth = Object.keys(r.days).filter(k => k.startsWith(ui.calMonth));
    const monthTotal = thisMonth.reduce((a, k) => a + r.days[k].delta, 0);
    
    view().innerHTML = `
      <div class="datenav"><div><h1>History</h1><div class="sub">Tap a day to view or edit it</div></div>${dmFace(2)}</div>
      <section class="card">
        <div class="calhead">
          <button class="iconbtn" data-m="-1" aria-label="Previous month"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
          <h2 style="margin:0">${monthName}</h2>
          <button class="iconbtn" data-m="1" aria-label="Next month" ${ui.calMonth >= today.slice(0, 7) ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
        </div>
        <div class="cal">${cells}</div>
        <div class="st-legend">${['poor', 'okay', 'great'].map(t => `<div><img class="sticker" src="${STICKERS[t].img}" alt="" width="40" height="40"><b>${STICKERS[t].name}</b><span>${t === 'poor' ? state.settings.stickerPoor + ' or less' : t === 'great' ? state.settings.stickerGreat + '+' : (state.settings.stickerPoor + 1) + ' to ' + (state.settings.stickerGreat - 1)}</span></div>`).join('')}</div>
        <div class="stats"><div class="stat"><b class="num">${sign(monthTotal)}</b><span>XP this month</span></div><div class="stat"><b class="num">${thisMonth.filter(k => tierOf(r.days[k].delta) === 'great').length}</b><span>Huge days</span></div><div class="stat"><b class="num">${thisMonth.filter(k => tierOf(r.days[k].delta) === 'poor').length}</b><span>Rough days</span></div></div>
      </section>
      <section class="card">
        <h2>Streaks</h2>
        <div class="chips" style="margin-top:0">${chip('Steps', r.streaks.steps)}${chip('Eating window', r.streaks.window)}${chip('Clean eating', r.streaks.healthy)}${frzChip(r)}</div>
        <p class="hint" style="margin-top:10px">×1.5 points at 7 days, ×2 at 30. Every 7 days in a row on any streak earns a freeze (hold up to 2). A missed day uses one automatically so the streak survives.</p>
      </section>
      ${albumCard()}
      ${recapListCard(r)}
      <section class="card">
        <h2>Recent days</h2>
        ${recent.length ? `<ul class="lines">${recent.map(k => `<li>${stickerImg(r.days[k].delta, 30, 'sm-st', k)}<button data-day="${k}" style="text-align:left;flex:1">${fmtDate(k, { weekday: 'short', day: 'numeric', month: 'short' })}<span class="meta">${r.days[k].capped ? 'capped' : ''}</span></button><span class="p ${cls(r.days[k].delta)}">${sign(r.days[k].delta)}</span></li>`).join('')}</ul>` : '<p class="empty">No days logged yet.</p>'}
      </section>`;

    view().querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      const d = new Date(y, m - 1 + (+b.dataset.m), 1); ui.calMonth = d.getFullYear() + '-' + pad(d.getMonth() + 1); render();
    });
    view().querySelectorAll('[data-day]').forEach(b => b.onclick = () => { ui.date = b.dataset.day; setTab('today'); });
    view().querySelectorAll('[data-alb]').forEach(b => b.onclick = () => {
      const [t, i] = b.dataset.alb.split(':'), x = (t === 'p' ? DANIELLE : DANI_GIFS)[+i];
      if (x.lv > peakL) { walkerReact(null, 0, 'Reach level ' + x.lv + ' to unlock that one.', 0); return; }
      lightbox(t === 'p' ? `<img src="${x.img}${x.fit ? '?v=3' : ''}" alt="Danielle Marsh">` : gifVid(x, 'lb-gif'));
    });
    view().querySelectorAll('[data-alt]').forEach(b => b.onclick = () => { ui.album = b.dataset.alt; render(); });
    view().querySelectorAll('[data-recap]').forEach(b => b.onclick = () => showRecap(b.dataset.recap, r));
  }

  // ---------- collection album ----------
  function albumCard() {
    const t = ui.album || 'p', list = t === 'p' ? DANIELLE : DANI_GIFS;
    const all = DANIELLE.concat(DANI_GIFS), got = all.filter(x => x.lv <= peakL).length;
    const next = all.filter(x => x.lv > peakL).reduce((m, x) => Math.min(m, x.lv), Infinity);
    const lock = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';
    return `<section class="card album">
      <h2>Danielle collection <small class="num">${got}/${all.length} unlocked</small></h2>
      <div class="seg" role="radiogroup" aria-label="Collection type"><button role="radio" data-alt="p" aria-checked="${t === 'p'}">Photos</button><button role="radio" data-alt="g" aria-checked="${t === 'g'}">GIFs</button></div>
      <div class="alb-grid">${list.map((x, i) => { const open = x.lv <= peakL; return `<button class="${open ? '' : 'locked'}" data-alb="${t}:${i}" aria-label="${open ? 'Open' : 'Locked until level ' + x.lv}"><img src="${t === 'p' ? x.img.replace('/body/', '/body/t/') : x.poster}" alt="" loading="lazy">${open ? '' : `<span>${lock}Lv ${x.lv}</span>`}</button>`; }).join('')}</div>
      <p class="hint" style="margin-top:8px">${isFinite(next) ? 'Next unlock at level ' + next + '. ' : 'Everything unlocked. '}Unlocks are kept even if you drop a level.</p>
    </section>`;
  }

  // ---------- weekly recap ----------
  function recapData(ws, r) {
    const days = [], we = addDays(ws, 6);
    for (let i = 0; i < 7; i++) { const ds = addDays(ws, i); if (r.days[ds]) days.push([ds, r.days[ds]]); }
    if (!days.length) return null;
    const xp = days.reduce((a, [, x]) => a + x.delta, 0);
    const best = days.reduce((m, d) => d[1].delta > m[1].delta ? d : m, days[0]);
    const quests = days.reduce((a, [, x]) => a + x.lines.filter(l => l.label.startsWith('Quest:')).length, 0);
    const huge = days.filter(([, x]) => tierOf(x.delta) === 'great').length;
    const sl = days.map(([ds]) => state.days[ds] && state.days[ds].sleep).filter(v => v != null);
    const a0 = avg7(addDays(ws, -1)), a1 = avg7(we);
    return { ws, we, xp, best, quests, huge, logged: days.length, sleep: sl.length ? r1(sl.reduce((a, b) => a + b, 0) / sl.length) : null, wchg: a0 != null && a1 != null ? r1(a1 - a0) : null, avg: a1 };
  }
  function recapWeeks(r) {
    const cur = weekKey(todayStr()), out = [], first = Object.keys(r.days).sort()[0];
    if (!first) return out;
    for (let w = addDays(cur, -7); w >= weekKey(first); w = addDays(w, -7)) { const d = recapData(w, r); if (d) out.push(d); if (out.length >= 12) break; }
    return out;
  }
  function recapListCard(r) {
    const ws = recapWeeks(r);
    return `<section class="card"><h2>Weekly recaps</h2>${ws.length ? `<ul class="lines">${ws.map(w => `<li><button data-recap="${w.ws}" style="text-align:left;flex:1">Week of ${esc(fmtDate(w.ws, { day: 'numeric', month: 'short' }))}<span class="meta">${w.huge} huge day${w.huge === 1 ? '' : 's'}${w.wchg != null ? ' · ' + (w.wchg > 0 ? '+' : '') + w.wchg + ' kg' : ''}</span></button><span class="p ${cls(w.xp)}">${sign(w.xp)}</span></li>`).join('')}</ul>` : '<p class="empty">Your first recap appears the Monday after your first logged week.</p>'}</section>`;
  }
  function showRecap(ws, r) {
    r = r || compute();
    const w = recapData(ws, r); if (!w) return;
    const g = gifRand(w.xp > 0 ? ['c', 't', 'h'] : ['s', 'h']);
    const stat = (v, l) => `<div class="stat"><b class="num">${v}</b><span>${l}</span></div>`;
    const head = w.xp >= 300 ? 'What a week.' : w.xp > 0 ? 'Good week. Keep building.' : 'Tough week. Fresh start now.';
    lightbox(`<div class="recap">
      ${state.settings.showDanielle ? gifVid(g, 'rc-gif') : ''}
      <div class="label">Weekly recap · ${esc(fmtDate(w.ws, { day: 'numeric', month: 'short' }))} – ${esc(fmtDate(w.we, { day: 'numeric', month: 'short' }))}</div>
      <h2>${head}</h2>
      <div class="stats">${stat(sign(w.xp), 'XP')}${stat(w.wchg != null ? (w.wchg > 0 ? '+' : '') + w.wchg + ' kg' : '—', 'weight (7-day avg)')}${stat(w.huge, 'huge days')}</div>
      <div class="stats">${stat(w.quests, 'quests done')}${stat(w.sleep != null ? w.sleep + ' h' : '—', 'avg sleep')}${stat(w.logged + '/7', 'days logged')}</div>
      <p class="hint">Best day: ${esc(fmtDate(w.best[0], { weekday: 'long' }))} (${sign(w.best[1].delta)} XP). Streaks now: steps ${r.streaks.steps}, eating window ${r.streaks.window}, clean eating ${r.streaks.healthy}.</p>
      <button class="btn" id="rc-ok" style="width:100%;margin-top:10px">Let’s go</button></div>`, el => { el.querySelector('#rc-ok').onclick = () => el.remove(); });
  }
  function maybeRecap() {
    const r = compute(), last = addDays(weekKey(todayStr()), -7);
    if (fun().recapSeen === last) return;
    if (!recapData(last, r)) return;
    fun().recapSeen = last; save();
    setTimeout(() => showRecap(last, r), 900);
  }

  function renderSettings() {
    const s = state.settings, P = s.pts;
    const num = (path, label, step) => {
      const v = path.startsWith('pts.') ? P[path.slice(4)] : s[path];
      return `<label for="s-${path}">${label}</label><input id="s-${path}" data-path="${path}" type="number" inputmode="decimal" step="${step || 1}" value="${v ?? ''}">`;
    };
    const time = (path, label) => `<label for="s-${path}">${label}</label><input id="s-${path}" data-path="${path}" type="time" value="${s[path]}">`;
    view().innerHTML = `
      <div class="datenav"><div><h1>Rules</h1><div class="sub">Changes apply to all days, including past ones</div></div>${dmFace(3)}</div>
      ${shopCard()}
      <section class="card howto">
        <h2>How it works</h2>
        <ul class="lines">
          <li><span>Tap Danielle at the bottom of the screen to log food, exercise, steps, weight or water, or shuffle her look.</span></li>
          <li><span>Daily quests: a steps quest (10,000–20,000) and a workout challenge (for example 100 push-ups or a 3 km run), each with a new target daily worth +15 to +35, plus three random quests at ${sign(P.quest)} each. ${sign(P.questAll)} for all five. Tap a quest to log it.</span></li>
          <li><span>Combo: hit your steps, do a workout and keep all food inside the eating window for 1.5× points that day.</span></li>
          <li><span>Water and sleep: ${sign(P.water)} for ${s.waterTarget / 1000} L water, ${sign(P.sleepGood)} for 7–9 h sleep, ${P.sleepBad} under 6 h, ${sign(P.rhrLow)} for resting heart rate below your 30-day average.</span></li>
        </ul>
      </section>
      <section class="card"><div class="set">
        <div class="grp">Body weight</div>
        ${num('startWeight', 'Start weight (kg)', 0.1)}${num('goalWeight', 'Goal weight (kg)', 0.1)}
        ${num('trendTolerance', 'Weekly rise allowed (kg)', 0.1)}${num('maintenanceBand', 'Maintenance band ± (kg)', 0.1)}
        <div class="grp">Eating window</div>
        ${time('windowStart', 'Opens')}${time('windowEnd', 'Closes')}
        <div class="grp">Steps</div>
        ${num('stepTarget', 'Daily target')}${num('stepBonusAt', 'Bonus at')}${num('lowSteps', 'Low-activity below')}
        <div class="grp">Water</div>
        ${num('waterTarget', 'Water target (ml)', 250)}
      </div></section>
      <section class="card"><div class="set">
        <div class="grp">Earn</div>
        ${num('pts.boxing', 'Boxing 30 min')}${num('pts.strength', 'Strength session')}${num('pts.cardio', 'Other cardio 30 min')}
        ${num('pts.steps', 'Step target hit')}${num('pts.stepsBonus', 'Step bonus')}
        ${num('pts.healthy', 'Healthy meal')}${num('pts.healthyMax', 'Healthy meals counted per day')}
        ${num('pts.windowBonus', 'All food healthy and inside window')}${num('pts.water', 'Water target')}${num('pts.sleepGood', 'Sleep 7–9 h')}${num('pts.rhrLow', 'Resting heart rate below average')}${num('pts.complete', 'Logged everything')}
        ${num('pts.kgMilestone', 'Each kg lost')}${num('pts.pctMilestone', 'Each 5% body weight')}${num('pts.maintainWeek', 'Maintenance week')}
        <div class="grp">Lose (use negative numbers)</div>
        ${num('pts.unhealthy', 'Unhealthy item')}${num('pts.overate', 'Overate')}${num('pts.alcohol', 'Alcohol, per drink')}
        ${num('pts.outside', 'Food outside window')}${num('pts.lowSteps', 'Low-activity day')}${num('pts.sleepBad', 'Sleep under 6 h')}${num('pts.trendUp', 'Weekly average up')}
        ${num('dailyCap', 'Maximum daily loss')}
        <div class="grp">Stickers (daily score)</div>
        ${num('stickerPoor', 'Rough day at or below')}${num('stickerGreat', 'Huge day at or above')}
        <p class="hint" style="grid-column:1/-1">Anything in between is a solid day. Each tier has its own Danielle stickers.</p>
      </div></section>
      <section class="card">
        <h2>Levels</h2>
        <ul class="lines">${TITLES.map(([min, n], i) => `<li><span>${n}</span><span class="meta num">Level ${min}${TITLES[i + 1] ? '–' + (TITLES[i + 1][0] - 1) : '+'} · from ${threshold(min).toLocaleString()} XP</span></li>`).join('')}</ul>
        <p class="hint" style="margin-top:8px">Each level needs more XP than the last. Fall below a level's threshold and you drop back.</p>
      </section>
      <section class="card">
        <h2>Photos</h2>
        <label class="toggle"><input type="checkbox" id="dm-toggle" ${s.showDanielle ? 'checked' : ''}><span>Show Danielle photos</span></label>
        <div class="grp" style="margin-top:14px">Theme</div>
        <div class="themes" role="radiogroup" aria-label="Theme">
          ${THEMES.map(([k, l, c]) => `<button role="radio" data-theme="${k}" aria-checked="${(s.theme || 'sunflower') === k}"><span class="sw">${c.map(x => `<i style="background:${x}"></i>`).join('')}</span>${l}</button>`).join('')}
        </div>
        <div class="grp" style="margin-top:14px">Walking Danielle</div>
        <div class="seg" role="radiogroup" aria-label="Walking Danielle style">
          <button role="radio" data-pet="sticker" aria-checked="${s.petStyle !== 'pixel'}"><img src="./stickers/dani/okay1.webp" alt="">Sticker</button>
          <button role="radio" data-pet="pixel" aria-checked="${s.petStyle === 'pixel'}"><img class="px" src="./stickers/pixel/okay1.png" alt="">Pixel art</button>
        </div>
        <p class="hint" style="margin-top:10px">${unl(DANIELLE).length} of ${DANIELLE.length} photos and ${unl(DANI_GIFS).length} of ${DANI_GIFS.length} GIFs unlocked so far; more unlock as you level up (see the collection in History). The photo changes each day; tap the photo to see the next one, or the shuffle button for a random one. Tap the walking Danielle at the bottom of any tab to log food, exercise, steps and weight.</p>
      </section>
      ${healthCard()}
      ${remindCard()}
      <section class="card">
        <h2>Data</h2>
        <div class="row" style="margin:0">
          <button class="btn ghost" id="export">Download backup</button>
          <button class="btn ghost" id="defaults">Reset rules</button>
          <button class="btn danger" id="wipe">Delete all data</button>
        </div>
      </section>`;

    view().querySelectorAll('[data-path]').forEach(inp => inp.addEventListener('change', () => {
      const path = inp.dataset.path, isTime = inp.type === 'time';
      let v = isTime ? inp.value : (inp.value === '' ? null : +inp.value);
      if (!isTime && v != null && isNaN(v)) return;
      if (path.startsWith('pts.')) { if (v == null) return; s.pts[path.slice(4)] = v; } else s[path] = v;
      save(); toast('Rule updated', 'pos');
    }));
    shopBind();
    view().querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
      const t = document.getElementById(b.dataset.copy).textContent;
      try { await navigator.clipboard.writeText(t); toast('Copied', 'pos'); }
      catch (e) { const r = document.createRange(); r.selectNodeContents(document.getElementById(b.dataset.copy)); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Selected. Tap Copy', ''); }
    });
    document.getElementById('dm-toggle').onchange = e => { s.showDanielle = e.target.checked; save(); render(); };
    view().querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { s.theme = b.dataset.theme; save(); render(); });
    view().querySelectorAll('[data-pet]').forEach(b => b.onclick = () => { s.petStyle = b.dataset.pet; save(); render(); walkerReact(null, 0, s.petStyle === 'pixel' ? 'Pixel mode.' : 'Sticker mode.', 0); });
    document.getElementById('export').onclick = () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'dani-days-backup-' + todayStr() + '.json'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    document.getElementById('defaults').onclick = async () => {
      if (await confirmBox('Reset all point values, targets and the eating window to the defaults? Your log and weights are kept.')) {
        const sw = s.startWeight, gw = s.goalWeight; state.settings = clone(DEFAULT_SETTINGS); state.settings.startWeight = sw; state.settings.goalWeight = gw; save(); render(); toast('Rules reset', 'pos');
      }
    };
    document.getElementById('wipe').onclick = async () => {
      if (await confirmBox('Delete every logged day, weigh-in and setting? This cannot be undone.')) {
        state = { settings: clone(DEFAULT_SETTINGS), days: {} }; save(); render(); toast('All data deleted', 'neg');
      }
    };
  }

  // ---------- reward shop (Stars = XP gained; spending never touches XP or level) ----------
  const STAR = '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>';
  const SHOP_DEFAULT = [['Cheat meal', 300], ['Takeaway night', 500], ['Day off training', 400], ['New gym outfit', 1500], ['New trainers', 2500]];
  function shop() {
    const f = fun();
    if (!f.shop) f.shop = { items: SHOP_DEFAULT.map(([name, cost]) => ({ id: uid(), name, cost })), bought: [] };
    return f.shop;
  }
  function starBal(r) { const sp = shop().bought.reduce((a, b) => a + b.cost, 0); return Math.max(0, (r || compute()).stars - sp); }
  function shopCard() {
    const sh = shop(), r = compute(), bal = starBal(r);
    return `<section class="card shop">
      <h2>Reward shop <small class="stars">${STAR}<b class="num">${bal.toLocaleString()}</b> Stars</small></h2>
      <ul class="shop-list">${sh.items.map(it => `<li><span class="nm">${esc(it.name)}</span><span class="cost num">${STAR}${it.cost.toLocaleString()}</span>
        <button class="btn sm" data-buy="${it.id}" ${bal < it.cost ? 'disabled' : ''}>${bal < it.cost ? (it.cost - bal).toLocaleString() + ' to go' : 'Buy'}</button>
        <button class="x" data-sedit="${it.id}" aria-label="Edit ${esc(it.name)}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg></button></li>`).join('')}</ul>
      <div class="row shop-add"><label class="field" style="flex:2"><input id="sh-name" placeholder="New reward" maxlength="40"></label><label class="field" style="flex:1"><input id="sh-cost" type="number" inputmode="numeric" min="1" placeholder="Stars"></label><button class="btn ghost" id="sh-add">Add</button></div>
      ${sh.bought.length ? `<div class="grp" style="margin-top:12px">Bought</div><ul class="lines">${sh.bought.slice(-5).reverse().map(b => `<li><span>${esc(b.name)}<span class="meta">${esc(fmtDate(b.date, { day: 'numeric', month: 'short' }))}</span></span><span class="p">−${b.cost.toLocaleString()}</span></li>`).join('')}</ul>` : ''}
      <p class="hint" style="margin-top:8px">Every XP you gain also earns a Star. Spending Stars never lowers your XP or level.</p>
    </section>`;
  }
  function shopBind() {
    const sh = shop();
    view().querySelectorAll('[data-buy]').forEach(b => b.onclick = async () => {
      const it = sh.items.find(x => x.id === b.dataset.buy); if (!it || starBal() < it.cost) return;
      if (!(await confirmBox(`Spend ${it.cost.toLocaleString()} Stars on “${it.name}”? Your XP and level stay the same.`))) return;
      const rec = { id: uid(), itemId: it.id, name: it.name, cost: it.cost, date: todayStr() };
      sh.bought.push(rec); save(); render();
      walkerReact('great', 2, 'Enjoy it. You earned it.', 0); spawnHearts(5);
      showUndo('Bought ' + it.name, 0, () => { sh.bought = sh.bought.filter(x => x.id !== rec.id); save(); render(); walkerReact(null, 0, 'Refunded.', 0); });
    });
    view().querySelectorAll('[data-sedit]').forEach(b => b.onclick = () => {
      const it = sh.items.find(x => x.id === b.dataset.sedit); if (!it) return;
      lightbox(`<div class="sh-edit"><h2>Edit reward</h2><label class="field"><span>Name</span><input id="se-name" value="${esc(it.name)}" maxlength="40"></label><label class="field"><span>Stars</span><input id="se-cost" type="number" inputmode="numeric" min="1" value="${it.cost}"></label>
        <div class="row"><button class="btn danger" id="se-del">Delete</button><button class="btn" id="se-save" style="flex:1">Save</button></div></div>`, el => {
        el.querySelector('#se-save').onclick = () => { const n = el.querySelector('#se-name').value.trim(), c = Math.round(+el.querySelector('#se-cost').value); if (!n || !(c > 0)) return; it.name = n; it.cost = c; save(); el.remove(); render(); };
        el.querySelector('#se-del').onclick = () => { sh.items = sh.items.filter(x => x !== it); save(); el.remove(); render(); toast('Reward deleted', 'neg'); };
      });
    });
    const add = document.getElementById('sh-add');
    if (add) add.onclick = () => { const n = document.getElementById('sh-name').value.trim(), c = Math.round(+document.getElementById('sh-cost').value); if (!n || !(c > 0)) { toast('Add a name and a Star price', 'neg'); return; } sh.items.push({ id: uid(), name: n, cost: c }); save(); render(); toast('Reward added', 'pos'); };
  }

  // ---------- reminders (Apple Shortcuts automations) ----------
  function healthCard() {
    const url = API ? new URL(API + '/api/health/push', location.href).href : '';
    const last = HL.last ? new Date(HL.last.replace(' ', 'T') + 'Z') : null;
    const cp = (id, v, l) => `<div class="hk-row"><span class="hk-l">${l}</span><code id="${id}">${esc(v || '…')}</code><button class="btn ghost sm" data-copy="${id}">Copy</button></div>`;
    return `<section class="card health">
      <h2>Apple Health <small>${last ? 'last import ' + esc(last.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : 'not set up yet'}</small></h2>
      <p class="hint" style="margin-top:0">An iPhone Shortcut sends your steps, last night’s sleep and resting heart rate from Health. Anything you type in yourself is never overwritten.</p>
      ${cp('hk-url', url, 'Address')}${cp('hk-key', HL.key, 'Key')}
      <details class="hk-how"><summary>Set up the Shortcut (once, about 5 minutes)</summary>
      <ol class="rm-steps">
        <li>In <b>Shortcuts</b>, tap <b>+</b> and name the shortcut <b>Dani Days Health</b>.</li>
        <li><b>Steps:</b> add <b>Find Health Samples</b>. Set Type to <b>Steps</b>, Start Date <b>is today</b> and Group By <b>Day</b>. Then add <b>Calculate Statistics</b> and choose <b>Sum</b>.</li>
        <li><b>Yesterday’s steps:</b> repeat step 2, but set Start Date to <b>is yesterday</b>. This lets steps from after the last evening run still count.</li>
        <li><b>Sleep:</b> add <b>Find Health Samples</b>. Set Type to <b>Sleep Analysis</b> and Start Date <b>is in the last 1 day</b>. Add the filters Value <b>is not In Bed</b> and Value <b>is not Awake</b>. Then add <b>Get Details of Health Samples</b> (Duration), then <b>Calculate Statistics</b> and choose <b>Sum</b>.</li>
        <li><b>Heart rate:</b> add <b>Find Health Samples</b>. Set Type to <b>Resting Heart Rate</b>, Sort by <b>Start Date</b>, Order <b>Latest First</b> and Limit <b>1</b>.</li>
        <li>Add <b>Get Contents of URL</b>. Paste the Address above, tap <b>Show More</b>, set Method to <b>POST</b> and Request Body to <b>JSON</b>, then add five Text fields:
          <b>key</b> = the Key above, <b>steps</b> = the Sum from step 2, <b>ysteps</b> = the Sum from step 3, <b>sleep</b> = the Sum from step 4, <b>rhr</b> = the Health Samples from step 5. To pick a value, tap the field, choose <b>Select Variable</b>, then tap that step’s result.</li>
        <li>Add <b>Show Notification</b> with <b>Contents of URL</b>. It will say something like “Dani Days got it: 8,123 steps, 7.5 h sleep, 62 bpm. Yesterday: 12,040 steps.”</li>
        <li>Tap ▶ once to test and allow Health access. Then go to <b>Automation</b> › <b>+</b> › <b>Time of Day</b>, choose <b>Daily</b> and <b>Run Immediately</b>, and set it to run <b>Dani Days Health</b>. Make one for each of these times: <b>08:00</b> (sleep and yesterday’s final steps), <b>12:00</b>, <b>15:00</b>, <b>18:00</b> and <b>21:30</b>.</li>
      </ol></details>
      <p class="hint">Heart rate needs an Apple Watch or another wearable. Sleep needs a Watch, a sleep app or iPhone Sleep Schedule. Steps update at each run (5 times a day with the times above). You can also tap the Shortcut, or add it as a widget, for an instant update. Resting heart rate changes about once a day.</p>
    </section>`;
  }
  function remindCard() {
    const s = state.settings, [h, m] = s.windowEnd.split(':').map(Number), d = new Date(2000, 0, 1, h, m - 30), kc = pad(d.getHours()) + ':' + pad(d.getMinutes());
    const steps = [['Morning weigh-in', '07:30', 'Weigh-in time. Then log sleep.'], ['Kitchen closing', kc, 'Kitchen closes at ' + s.windowEnd + '. Last healthy bite?'], ['Evening check-in', '21:45', 'Log your steps, water and protein.']];
    return `<section class="card remind">
      <h2>Reminders</h2>
      <p class="hint" style="margin-top:0">Danielle reminds you inside the app. For iPhone notifications, set up these Shortcuts automations once:</p>
      <ol class="rm-steps">
        <li>Open <b>Shortcuts</b> › <b>Automation</b> › <b>+</b> › <b>Time of Day</b>.</li>
        <li>Pick the time, choose <b>Daily</b> and <b>Run Immediately</b>.</li>
        <li>Add the action <b>Show Notification</b> and paste the text below. Repeat for each reminder.</li>
        <li>When it pops up, open Dani Days from your home screen to log it.</li>
      </ol>
      <ul class="lines">${steps.map(([n, t, msg]) => `<li><span>${n}<span class="meta">“${esc(msg)}”</span></span><span class="p num">${t}</span></li>`).join('')}</ul>
    </section>`;
  }

  // ---------- shell ----------
  const THEMES = [['sunflower', 'Sunflower', ['#fff7dc', '#ffc61a', '#7cc4ff']], ['bunny', 'Bunny pastel', ['#141a2b', '#8ec5ff', '#ffb3c7']], ['sunset', 'Sunset glow', ['#1e1420', '#ffb38a', '#ff6f91']],
    ['pink', 'Dark pink', ['#121110', '#ff6fa3', '#ffb3c7']], ['classic', 'Classic gold', ['#121110', '#f2b134', '#6fd08c']]];
  function applyTheme() {
    const t = state.settings.theme || 'sunflower';
    document.documentElement.dataset.theme = t;
    const m = document.querySelector('meta[name=theme-color]');
    const sb = document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]');
    if (sb) sb.setAttribute('content', t === 'sunflower' ? 'default' : 'black-translucent');
    if (m) m.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#121110');
  }
  const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function render() {
    applyTheme();
    if (chart && ui.tab !== 'progress') { chart.destroy(); chart = null; }
    ({ today: () => renderToday(), progress: renderProgress, history: renderHistory, settings: renderSettings })[ui.tab]();
    if (ui.tab === 'progress') view().querySelectorAll('[data-orb]').forEach(b => b.onclick = () => { walkerRing(false); ui.date = todayStr(); openSheet(b.dataset.orb); });
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab));
    walkerUpdate();
  }
  function setTab(t) { const ch = ui.tab !== t; ui.tab = t; walkerRing(false); closeSheet(); render(); window.scrollTo(0, 0); if (ch && WK.el && !WK.sleep) { setTimeout(() => { showSay(TAB_LINES[t](), 5500); WK.nextSay = performance.now() + 9500; }, 1000); } }
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { if (b.dataset.tab === 'today' && ui.tab === 'today') ui.date = todayStr(); setTab(b.dataset.tab); });

  // keep "today" current if the app stays open past midnight
  let lastToday = todayStr();
  setInterval(() => { const t = todayStr(); if (t !== lastToday) { if (ui.date === lastToday) ui.date = t; lastToday = t; render(); } }, 60000);

  load().then(() => { render(); walkerInit(); maybeRecap(); healthSync(); });
})();
