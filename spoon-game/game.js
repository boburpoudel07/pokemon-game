/* ============================================================
   game.js — Pokémon evolution game logic
   Exposes: eatSpoon(), restart()
   Consumed by: camera.js (calls eatSpoon on detection)
   ============================================================ */

/* ── AUDIO ── */
let _actx = null;
function actx() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  if (_actx.state === 'suspended') _actx.resume();
  return _actx;
}
function sn(ctx, type, freq, t, dur, vol, ef) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (ef) o.frequency.exponentialRampToValueAtTime(ef, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}
function nz(ctx, t, dur, vol, hz) {
  const n = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = 1.5;
  const g = ctx.createGain();
  src.connect(f); f.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t); src.stop(t + dur + 0.02);
}

const playWhoosh = () => { const ctx = actx(), t = ctx.currentTime; nz(ctx, t, .28, .12, 900); sn(ctx, 'sine', 600, t, .25, .06, 200); };
const playChomp  = () => { const ctx = actx(), t = ctx.currentTime; sn(ctx, 'triangle', 280, t, .13, .55, 55); nz(ctx, t, .1, .35, 1800); sn(ctx, 'sine', 160, t + .12, .1, .22, 80); };
const playEvolveStart = () => { const ctx = actx(), t = ctx.currentTime; [220, 277, 330, 440, 554, 660, 880].forEach((f, i) => { sn(ctx, 'sine', f, t + i * .18, .35, .18); sn(ctx, 'triangle', f * 2, t + i * .18, .2, .06); }); };
const playEvolveDone  = () => { const ctx = actx(), t = ctx.currentTime; [[523.25, 0], [659.25, .06], [783.99, .12], [1046.5, .2]].forEach(([f, d]) => { sn(ctx, 'sine', f, t + d, .5, .22); sn(ctx, 'triangle', f * 1.5, t + d, .3, .08); }); };
const playWin = () => {
  const ctx = actx(), t = ctx.currentTime;
  [[392, 0, .12, .3], [392, .15, .12, .3], [392, .3, .12, .3], [523.25, .46, .2, .3],
   [659.25, .68, .2, .3], [783.99, .9, .38, .35], [622.25, 1.31, .2, .28],
   [659.25, 1.53, .2, .28], [783.99, 1.75, .65, .38]].forEach(([f, d, dur, vol]) => {
    sn(ctx, 'sine', f, t + d, dur, vol); sn(ctx, 'triangle', f * 1.5, t + d, dur * .6, vol * .25);
  });
};

/* ── POKÉMON DATA ── */
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
/* Three dragon evolution lines: Dratini → Bagon → Gible */
const EVOS = [
  /* ── Dratini line ── */
  { name: 'Dratini',   type: 'Dragon', color: '#6F35FC', glow: 'rgba(111,53,252,.55)',  at: 0,  id: 147, bg: ['#d8e8ff', '#80b0e8'] },
  { name: 'Dragonair', type: 'Dragon', color: '#6F35FC', glow: 'rgba(80,130,220,.65)',  at: 12, id: 148, bg: ['#b8d8f8', '#5090d0'] },
  { name: 'Dragonite', type: 'Dragon', color: '#6F35FC', glow: 'rgba(220,160,40,.65)',  at: 25, id: 149, bg: ['#fff0b8', '#e0a820'] },
  /* ── Bagon line ── */
  { name: 'Bagon',     type: 'Dragon', color: '#6F35FC', glow: 'rgba(100,110,160,.65)', at: 37, id: 371, bg: ['#d0d8f0', '#6070a8'] },
  { name: 'Shelgon',   type: 'Dragon', color: '#6F35FC', glow: 'rgba(140,140,150,.65)', at: 50, id: 372, bg: ['#e0e0e8', '#909098'] },
  { name: 'Salamence', type: 'Dragon', color: '#6F35FC', glow: 'rgba(40,80,200,.65)',   at: 63, id: 373, bg: ['#b0c8f8', '#2858c0'] },
  /* ── Gible line ── */
  { name: 'Gible',     type: 'Dragon', color: '#6F35FC', glow: 'rgba(90,70,160,.65)',   at: 73, id: 443, bg: ['#d0c8f0', '#5848a8'] },
  { name: 'Gabite',    type: 'Dragon', color: '#6F35FC', glow: 'rgba(60,90,170,.65)',   at: 83, id: 444, bg: ['#b8c8f8', '#3858b0'] },
  { name: 'Garchomp',  type: 'Dragon', color: '#6F35FC', glow: 'rgba(30,50,150,.65)',   at: 92, id: 445, bg: ['#98b0f0', '#1838a0'] },
  /* ── Ghost line ── */
  { name: 'Gastly',    type: 'Ghost',  color: '#735797', glow: 'rgba(115,87,151,.65)', at: 100, id: 92,  bg: ['#d8c8f0', '#8060b0'] },
  { name: 'Haunter',   type: 'Ghost',  color: '#735797', glow: 'rgba(95,65,135,.65)',  at: 110, id: 93,  bg: ['#c8b8e8', '#6048a0'] },
  { name: 'Gengar',    type: 'Ghost',  color: '#735797', glow: 'rgba(80,50,120,.65)',  at: 120, id: 94,  bg: ['#b8a8e0', '#503890'] },
  { name: 'Misdreavus',type: 'Ghost',  color: '#735797', glow: 'rgba(130,80,150,.65)', at: 130, id: 200, bg: ['#e0c8f0', '#9060b8'] },
  { name: 'Mismagius', type: 'Ghost',  color: '#735797', glow: 'rgba(150,50,180,.65)', at: 140, id: 429, bg: ['#e8b0f8', '#a030d0'] },
];

// Preload all images
EVOS.forEach(e => { const i = new Image(); i.src = BASE + e.id + '.png'; });

/* ── STATE ── */
let count = 0, evoIdx = 0, eating = false, evolving = false;

/* ── TIMER ── */
const TIMER_SECS = 90;
let timerRemaining = TIMER_SECS;
let timerInterval  = null;
let timerPaused    = false;

/* ── DOM ── */
const counterNum    = document.getElementById('counterNum');
const progressBar   = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const evoNameEl     = document.getElementById('evoName');
const typeBadgeEl   = document.getElementById('typeBadge');
const pokeDisc      = document.getElementById('pokeDisc');
const pokeImg       = document.getElementById('pokeImg');
const evoFlash      = document.getElementById('evoFlash');
const evoMsg        = document.getElementById('evoMsg');
const winOverlay    = document.getElementById('winOverlay');
const winPokes      = document.getElementById('winPokes');
const scene         = document.getElementById('scene');
const timerNumEl    = document.getElementById('timerNum');
const timerBarEl    = document.getElementById('timerBar');
const breakBtn      = document.getElementById('breakBtn');

function applyEvo(e) {
  evoNameEl.textContent   = e.name;
  typeBadgeEl.textContent = e.type;
  typeBadgeEl.style.setProperty('--type-color', e.color);
  document.documentElement.style.setProperty('--bg1', e.bg[0]);
  document.documentElement.style.setProperty('--bg2', e.bg[1]);
  document.documentElement.style.setProperty('--glow', e.glow);
  pokeDisc.style.boxShadow = `0 0 0 6px ${e.glow}, 0 12px 36px rgba(0,0,0,.22)`;
  pokeImg.src = BASE + e.id + '.png';
  pokeImg.alt = e.name;
}

function updateTimerUI() {
  timerNumEl.textContent = timerRemaining;
  const pct = (timerRemaining / TIMER_SECS * 100).toFixed(1);
  timerBarEl.style.width = pct + '%';
  const low = timerRemaining <= 10;
  timerNumEl.classList.toggle('danger', low);
  timerBarEl.classList.toggle('danger', low);
}

function resetTimer() {
  timerRemaining = TIMER_SECS;
  timerNumEl.classList.remove('danger', 'penalty-flash');
  timerBarEl.classList.remove('danger');
  updateTimerUI();
}

function penaltyPopup() {
  const el = document.createElement('div'); el.className = 'penalty-popup'; el.textContent = '−2 🥄';
  const r = pokeDisc.getBoundingClientRect();
  el.style.cssText = `left:${r.left + r.width / 2 - 40}px;top:${r.top - 20}px`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1100);
}

function applyTimerPenalty() {
  count = Math.max(0, count - 2);
  counterNum.textContent = count;
  counterNum.classList.remove('bump'); void counterNum.offsetWidth; counterNum.classList.add('bump');
  timerNumEl.classList.remove('penalty-flash'); void timerNumEl.offsetWidth; timerNumEl.classList.add('penalty-flash');
  penaltyPopup();
  updateUI();
  resetTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (window.gameWon) { clearInterval(timerInterval); timerInterval = null; return; }
    timerRemaining--;
    updateTimerUI();
    if (timerRemaining <= 0) applyTimerPenalty();
  }, 1000);
}

window.toggleTimerBreak = function() {
  if (window.gameWon) return;
  timerPaused = !timerPaused;
  if (timerPaused) {
    clearInterval(timerInterval); timerInterval = null;
    breakBtn.textContent = '▶ Resume';
    breakBtn.classList.add('paused');
  } else {
    breakBtn.textContent = '⏸ Break';
    breakBtn.classList.remove('paused');
    startTimer();
  }
};

function updateUI() {
  const cur = EVOS[evoIdx], next = EVOS[evoIdx + 1];
  if (next) {
    progressBar.style.width = ((count - cur.at) / (next.at - cur.at) * 100) + '%';
    const rem = next.at - count;
    progressLabel.textContent = rem + ' more spoon' + (rem !== 1 ? 's' : '') + ' to get ' + next.name + '!';
  } else {
    progressBar.style.width = '100%';
    progressLabel.textContent = '🏆 Fully evolved — 10 more spoons to win!';
  }
}

/* ── PARTICLES ── */
const COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff', '#ff9a3c', '#ff6bd6', '#6be5ff'];
function burst(x, y, n = 14) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    const sz = 8 + Math.random() * 10, ang = (i / n) * Math.PI * 2 + Math.random() * .5, dist = 55 + Math.random() * 70;
    p.style.cssText = `width:${sz}px;height:${sz}px;background:${COLORS[~~(Math.random() * COLORS.length)]};left:${x}px;top:${y}px;--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 30}px;animation-duration:${.5 + Math.random() * .5}s`;
    document.body.appendChild(p); setTimeout(() => p.remove(), 1100);
  }
}
function scorePopup(x, y) {
  const el = document.createElement('div'); el.className = 'score-popup'; el.textContent = '+1 🥄';
  el.style.cssText = `left:${x - 30}px;top:${y - 30}px`; document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function launchSpoon() {
  const s = document.createElement('div'); s.className = 'flying-spoon'; s.textContent = '🥄'; scene.appendChild(s);
  playWhoosh();
  const r = pokeDisc.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  setTimeout(() => { burst(cx, cy); scorePopup(cx, cy - 28); playChomp(); s.remove(); }, 440);
}

function doEatAnim() {
  pokeImg.classList.remove('bounce'); void pokeImg.offsetWidth; pokeImg.classList.add('bounce');
  pokeImg.addEventListener('animationend', () => pokeImg.classList.remove('bounce'), { once: true });
}

function triggerEvolution(newIdx) {
  evolving = true;
  const prev = EVOS[newIdx - 1], next = EVOS[newIdx];
  evoMsg.textContent = `What?! ${prev.name} is evolving!`; evoMsg.classList.add('show');
  playEvolveStart();
  pokeImg.classList.remove('evolving'); void pokeImg.offsetWidth; pokeImg.classList.add('evolving');
  setTimeout(() => { evoFlash.classList.add('flashing'); }, 150);
  setTimeout(() => { applyEvo(next); evoNameEl.style.transform = 'scale(1.5)'; setTimeout(() => evoNameEl.style.transform = '', 400); }, 900);
  setTimeout(() => {
    evoFlash.classList.remove('flashing'); pokeImg.classList.remove('evolving');
    evoMsg.textContent = `${prev.name} evolved into ${next.name}! 🎉`;
    playEvolveDone();
    pokeDisc.classList.add('sparkle-ring'); setTimeout(() => pokeDisc.classList.remove('sparkle-ring'), 1100);
    for (let i = 0; i < 8; i++) setTimeout(() => burst(100 + Math.random() * (window.innerWidth - 200), 80 + Math.random() * (window.innerHeight - 160), 22), i * 140);
  }, 1550);
  setTimeout(() => { evoMsg.classList.remove('show'); evolving = false; }, 3400);
}

/* ── PUBLIC: eatSpoon ── */
window.eatSpoon = function eatSpoon() {
  if (eating || evolving || timerPaused) return;
  eating = true;

  count++;
  counterNum.textContent = count;
  counterNum.classList.remove('bump'); void counterNum.offsetWidth; counterNum.classList.add('bump');
  doEatAnim();
  launchSpoon();
  resetTimer();

  let newIdx = 0;
  for (let i = 0; i < EVOS.length; i++) { if (count >= EVOS[i].at) newIdx = i; }
  if (newIdx > evoIdx) { evoIdx = newIdx; setTimeout(() => triggerEvolution(evoIdx), 480); }

  updateUI();

  if (count >= 150) {
    const delay = evolving ? 4000 : 1200;
    setTimeout(() => {
      winPokes.innerHTML = '';
      EVOS.forEach(e => {
        const img = document.createElement('img');
        img.src = BASE + e.id + '.png'; img.alt = e.name; img.className = 'win-poke-img';
        winPokes.appendChild(img);
      });
      winOverlay.classList.add('show');
      playWin();
      // Signal camera.js to stop detection
      window.gameWon = true;
    }, delay);
  }

  setTimeout(() => { eating = false; }, 3000);
};

/* ── PUBLIC: restart ── */
window.restart = function restart() {
  count = 0; evoIdx = 0; eating = false; evolving = false;
  window.gameWon = false;
  counterNum.textContent = '0';
  applyEvo(EVOS[0]);
  winOverlay.classList.remove('show');
  evoMsg.classList.remove('show');
  updateUI();
  timerPaused = false;
  breakBtn.textContent = '⏸ Break';
  breakBtn.classList.remove('paused');
  resetTimer();
  startTimer();
};

/* ── PUBLIC: skipStage ── */
window.skipStage = function skipStage() {
  if (evolving || winOverlay.classList.contains('show')) return;
  const nextEvo = EVOS[evoIdx + 1];
  if (nextEvo) {
    count = nextEvo.at;
    counterNum.textContent = count;
    counterNum.classList.remove('bump'); void counterNum.offsetWidth; counterNum.classList.add('bump');
    evoIdx++;
    eating = false;
    triggerEvolution(evoIdx);
    updateUI();
  } else if (count < 150) {
    count = 150;
    counterNum.textContent = count;
    updateUI();
    setTimeout(() => {
      winPokes.innerHTML = '';
      EVOS.forEach(e => {
        const img = document.createElement('img');
        img.src = BASE + e.id + '.png'; img.alt = e.name; img.className = 'win-poke-img';
        winPokes.appendChild(img);
      });
      winOverlay.classList.add('show');
      playWin();
      window.gameWon = true;
    }, 500);
  }
};

/* ── INPUT (spacebar fallback) ── */
document.addEventListener('keydown', e => {
  if ((e.code === 'Space' || e.key === ' ') && !winOverlay.classList.contains('show')) {
    e.preventDefault(); window.eatSpoon();
  }
});
document.addEventListener('click', e => {
  if (!winOverlay.classList.contains('show') && !e.target.closest('#restartBtn') && !e.target.closest('#camPanel') && !e.target.closest('#breakBtn') && !e.target.closest('#skipBtn')) {
    window.eatSpoon();
  }
});

document.getElementById('restartBtn').addEventListener('click', window.restart);
document.getElementById('skipBtn').addEventListener('click', window.skipStage);
document.getElementById('breakBtn').addEventListener('click', window.toggleTimerBreak);

/* ── FLOATING BG EMOJIS ── */
const bgEmojis = ['🥄', '✨', '⭐', '🌟', '🎉', '💫', '🔮', '🌈'];
function spawnFloat() {
  const el = document.createElement('div'); el.className = 'bg-float';
  el.textContent = bgEmojis[~~(Math.random() * bgEmojis.length)];
  const dur = 10 + Math.random() * 12;
  el.style.cssText = `left:${Math.random() * 100}vw;bottom:-60px;font-size:${1.2 + Math.random() * 1.8}rem;animation-duration:${dur}s`;
  document.body.appendChild(el); setTimeout(() => el.remove(), dur * 1000);
}
for (let i = 0; i < 6; i++) setTimeout(spawnFloat, i * 1800);
setInterval(spawnFloat, 2200);

/* ── FLOATING BG POKEMON SPRITES ── */
const GIF_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/';
const BG_POKES = [6, 25, 94, 130, 133, 143, 149, 150, 196, 197, 248, 249, 250, 373, 384, 445];
function spawnPokeFloat() {
  const id  = BG_POKES[~~(Math.random() * BG_POKES.length)];
  const el  = document.createElement('img');
  el.className = 'bg-poke-float';
  el.src = GIF_BASE + id + '.gif';
  const sz   = 80 + Math.random() * 100;
  const dur  = 14 + Math.random() * 12;
  const sway = ((Math.random() - 0.5) * 180).toFixed(0) + 'px';
  el.style.cssText = `left:${Math.random() * 92}vw;bottom:-${sz}px;width:${sz}px;height:${sz}px;--sway:${sway};animation-duration:${dur}s`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), dur * 1000);
}
for (let i = 0; i < 5; i++) setTimeout(spawnPokeFloat, i * 2800);
setInterval(spawnPokeFloat, 3200);

/* ── INIT ── */
window.gameWon = false;
applyEvo(EVOS[0]);
updateUI();
resetTimer();
startTimer();
