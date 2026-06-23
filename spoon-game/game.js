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
// iOS/Safari requires AudioContext to be resumed inside a user gesture
document.addEventListener('touchend', function unlock() {
  actx().resume();
  document.removeEventListener('touchend', unlock);
}, { once: true });
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

const LINE_POOL = [
  [ // Bulbasaur
    { name:'Bulbasaur',  type:'Grass',    color:'#78C850', glow:'rgba(120,200,80,.55)',  id:1,   bg:['#cff0c8','#88d060'] },
    { name:'Ivysaur',    type:'Grass',    color:'#58A830', glow:'rgba(88,168,48,.65)',   id:2,   bg:['#b0e0a0','#60b040'] },
    { name:'Venusaur',   type:'Grass',    color:'#3A7820', glow:'rgba(58,120,32,.65)',   id:3,   bg:['#90c878','#409028'] },
  ],[ // Charmander
    { name:'Charmander', type:'Fire',     color:'#F08030', glow:'rgba(240,128,48,.55)',  id:4,   bg:['#ffe0b8','#f09040'] },
    { name:'Charmeleon', type:'Fire',     color:'#D05018', glow:'rgba(208,80,24,.65)',   id:5,   bg:['#ffc898','#e07020'] },
    { name:'Charizard',  type:'Fire',     color:'#A03010', glow:'rgba(200,60,20,.70)',   id:6,   bg:['#ffb080','#c84010'] },
  ],[ // Squirtle
    { name:'Squirtle',   type:'Water',    color:'#6890F0', glow:'rgba(104,144,240,.55)', id:7,   bg:['#c8e0ff','#70a8f8'] },
    { name:'Wartortle',  type:'Water',    color:'#3860D0', glow:'rgba(56,96,208,.65)',   id:8,   bg:['#a8c8f8','#4880e0'] },
    { name:'Blastoise',  type:'Water',    color:'#1840A8', glow:'rgba(24,64,168,.65)',   id:9,   bg:['#80b0f0','#2060c8'] },
  ],[ // Caterpie
    { name:'Caterpie',   type:'Bug',      color:'#A8B820', glow:'rgba(168,184,32,.55)',  id:10,  bg:['#e8f0a0','#b0c030'] },
    { name:'Metapod',    type:'Bug',      color:'#8C9810', glow:'rgba(140,152,16,.65)',  id:11,  bg:['#d0d880','#909820'] },
    { name:'Butterfree', type:'Flying',   color:'#6870C8', glow:'rgba(104,112,200,.65)', id:12,  bg:['#c0c8f8','#7880d8'] },
  ],[ // Pidgey
    { name:'Pidgey',     type:'Flying',   color:'#A890F0', glow:'rgba(168,144,240,.55)', id:16,  bg:['#e8e0ff','#b0a0f8'] },
    { name:'Pidgeotto',  type:'Flying',   color:'#8870D0', glow:'rgba(136,112,208,.65)', id:17,  bg:['#d0c8ff','#9080e0'] },
    { name:'Pidgeot',    type:'Flying',   color:'#6850B0', glow:'rgba(104,80,176,.70)',  id:18,  bg:['#b8b0f0','#7060c0'] },
  ],[ // Abra
    { name:'Abra',       type:'Psychic',  color:'#F85888', glow:'rgba(248,88,136,.65)',  id:63,  bg:['#ffc0d8','#f87098'] },
    { name:'Kadabra',    type:'Psychic',  color:'#D83868', glow:'rgba(216,56,104,.65)',  id:64,  bg:['#f0a0c0','#d85080'] },
    { name:'Alakazam',   type:'Psychic',  color:'#B81848', glow:'rgba(184,24,72,.70)',   id:65,  bg:['#e08080','#c03060'] },
  ],[ // Machop
    { name:'Machop',     type:'Fighting', color:'#C03028', glow:'rgba(192,48,40,.65)',   id:66,  bg:['#f0b0b0','#d04040'] },
    { name:'Machoke',    type:'Fighting', color:'#A01818', glow:'rgba(160,24,24,.65)',   id:67,  bg:['#e09090','#b02828'] },
    { name:'Machamp',    type:'Fighting', color:'#800010', glow:'rgba(128,0,16,.70)',    id:68,  bg:['#d07070','#901020'] },
  ],[ // Bellsprout
    { name:'Bellsprout', type:'Grass',    color:'#78C830', glow:'rgba(120,200,48,.55)',  id:69,  bg:['#d0f0a0','#90c840'] },
    { name:'Weepinbell', type:'Grass',    color:'#58A820', glow:'rgba(88,168,32,.65)',   id:70,  bg:['#b0d880','#70b030'] },
    { name:'Victreebel', type:'Grass',    color:'#389010', glow:'rgba(56,144,16,.70)',   id:71,  bg:['#90c060','#508020'] },
  ],[ // Geodude
    { name:'Geodude',    type:'Rock',     color:'#B8A038', glow:'rgba(184,160,56,.65)',  id:74,  bg:['#e8dca0','#c0a840'] },
    { name:'Graveler',   type:'Rock',     color:'#988020', glow:'rgba(152,128,32,.65)',  id:75,  bg:['#d8c880','#a09030'] },
    { name:'Golem',      type:'Rock',     color:'#786018', glow:'rgba(120,96,24,.70)',   id:76,  bg:['#c0b060','#887020'] },
  ],[ // Gastly
    { name:'Gastly',     type:'Ghost',    color:'#705898', glow:'rgba(112,88,152,.65)',  id:92,  bg:['#c8b8e0','#8070b8'] },
    { name:'Haunter',    type:'Ghost',    color:'#503870', glow:'rgba(80,56,112,.65)',   id:93,  bg:['#b0a0d0','#6050a0'] },
    { name:'Gengar',     type:'Ghost',    color:'#302050', glow:'rgba(48,32,80,.80)',    id:94,  bg:['#8878c0','#403080'] },
  ],[ // Dratini
    { name:'Dratini',    type:'Dragon',   color:'#7038F8', glow:'rgba(112,56,248,.65)',  id:147, bg:['#d0b8ff','#8060f8'] },
    { name:'Dragonair',  type:'Dragon',   color:'#5010D0', glow:'rgba(80,16,208,.65)',   id:148, bg:['#b898f0','#6040d8'] },
    { name:'Dragonite',  type:'Dragon',   color:'#3000A0', glow:'rgba(48,0,160,.80)',    id:149, bg:['#9080e0','#4020b8'] },
  ],[ // Larvitar
    { name:'Larvitar',   type:'Rock',     color:'#B8A038', glow:'rgba(184,160,56,.65)',  id:246, bg:['#e8dca0','#c0a840'] },
    { name:'Pupitar',    type:'Rock',     color:'#708080', glow:'rgba(112,128,128,.65)', id:247, bg:['#c8d0d0','#7898a0'] },
    { name:'Tyranitar',  type:'Dark',     color:'#2E6040', glow:'rgba(40,90,50,.70)',    id:248, bg:['#90b898','#306848'] },
  ],[ // Chikorita
    { name:'Chikorita',  type:'Grass',    color:'#78C850', glow:'rgba(120,200,80,.55)',  id:152, bg:['#cff0c8','#88d060'] },
    { name:'Bayleef',    type:'Grass',    color:'#58A830', glow:'rgba(88,168,48,.65)',   id:153, bg:['#b0e0a0','#60b040'] },
    { name:'Meganium',   type:'Grass',    color:'#3A7820', glow:'rgba(58,120,32,.65)',   id:154, bg:['#90c878','#409028'] },
  ],[ // Cyndaquil
    { name:'Cyndaquil',  type:'Fire',     color:'#F08030', glow:'rgba(240,128,48,.55)',  id:155, bg:['#ffe0b8','#f09040'] },
    { name:'Quilava',    type:'Fire',     color:'#D05018', glow:'rgba(208,80,24,.65)',   id:156, bg:['#ffc898','#e07020'] },
    { name:'Typhlosion', type:'Fire',     color:'#A03010', glow:'rgba(200,60,20,.70)',   id:157, bg:['#ffb080','#c84010'] },
  ],[ // Totodile
    { name:'Totodile',   type:'Water',    color:'#6890F0', glow:'rgba(104,144,240,.55)', id:158, bg:['#c8e0ff','#70a8f8'] },
    { name:'Croconaw',   type:'Water',    color:'#3860D0', glow:'rgba(56,96,208,.65)',   id:159, bg:['#a8c8f8','#4880e0'] },
    { name:'Feraligatr', type:'Water',    color:'#1840A8', glow:'rgba(24,64,168,.65)',   id:160, bg:['#80b0f0','#2060c8'] },
  ],[ // Mareep
    { name:'Mareep',     type:'Electric', color:'#F8D030', glow:'rgba(248,208,48,.55)',  id:179, bg:['#fff8a0','#f8d848'] },
    { name:'Flaaffy',    type:'Electric', color:'#D8A020', glow:'rgba(216,160,32,.65)',  id:180, bg:['#f8e880','#d8b030'] },
    { name:'Ampharos',   type:'Electric', color:'#B88010', glow:'rgba(184,128,16,.70)',  id:181, bg:['#f0d060','#c09020'] },
  ],[ // Treecko
    { name:'Treecko',    type:'Grass',    color:'#78C850', glow:'rgba(120,200,80,.55)',  id:252, bg:['#cff0c8','#88d060'] },
    { name:'Grovyle',    type:'Grass',    color:'#58A830', glow:'rgba(88,168,48,.65)',   id:253, bg:['#b0e0a0','#60b040'] },
    { name:'Sceptile',   type:'Grass',    color:'#3A7820', glow:'rgba(58,120,32,.65)',   id:254, bg:['#90c878','#409028'] },
  ],[ // Torchic
    { name:'Torchic',    type:'Fire',     color:'#F08030', glow:'rgba(240,128,48,.55)',  id:255, bg:['#ffe0b8','#f09040'] },
    { name:'Combusken',  type:'Fire',     color:'#D05018', glow:'rgba(208,80,24,.65)',   id:256, bg:['#ffc898','#e07020'] },
    { name:'Blaziken',   type:'Fire',     color:'#A03010', glow:'rgba(200,60,20,.70)',   id:257, bg:['#ffb080','#c84010'] },
  ],[ // Mudkip
    { name:'Mudkip',     type:'Water',    color:'#6890F0', glow:'rgba(104,144,240,.55)', id:258, bg:['#c8e0ff','#70a8f8'] },
    { name:'Marshtomp',  type:'Water',    color:'#3860D0', glow:'rgba(56,96,208,.65)',   id:259, bg:['#a8c8f8','#4880e0'] },
    { name:'Swampert',   type:'Water',    color:'#1840A8', glow:'rgba(24,64,168,.65)',   id:260, bg:['#80b0f0','#2060c8'] },
  ],[ // Bagon
    { name:'Bagon',      type:'Dragon',   color:'#6040C0', glow:'rgba(96,64,192,.65)',   id:371, bg:['#c8b8f0','#7060d0'] },
    { name:'Shelgon',    type:'Dragon',   color:'#403080', glow:'rgba(64,48,128,.65)',   id:372, bg:['#a898d8','#5040a0'] },
    { name:'Salamence',  type:'Dragon',   color:'#2010A0', glow:'rgba(32,16,160,.80)',   id:373, bg:['#8878c8','#302090'] },
  ],[ // Gible
    { name:'Gible',      type:'Dragon',   color:'#7038F8', glow:'rgba(112,56,248,.65)',  id:443, bg:['#d0b8ff','#8060f8'] },
    { name:'Gabite',     type:'Dragon',   color:'#5018D0', glow:'rgba(80,24,208,.65)',   id:444, bg:['#b898f8','#6040e0'] },
    { name:'Garchomp',   type:'Dragon',   color:'#3800B0', glow:'rgba(56,0,176,.80)',    id:445, bg:['#9878e8','#4020c0'] },
  ],[ // Deino
    { name:'Deino',      type:'Dark',     color:'#5830A8', glow:'rgba(88,48,168,.65)',   id:633, bg:['#c8b0e8','#7050b8'] },
    { name:'Zweilous',   type:'Dark',     color:'#382880', glow:'rgba(56,40,128,.65)',   id:634, bg:['#a898d0','#503890'] },
    { name:'Hydreigon',  type:'Dragon',   color:'#1010A0', glow:'rgba(20,10,160,.80)',   id:635, bg:['#7868c0','#181898'] },
  ],
];

function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildEvos() {
  const lines = _shuffle(LINE_POOL).slice(0, 4);
  let at = 0;
  const evos = [];
  lines.forEach(line => { line.forEach(p => { evos.push({ ...p, at }); at += 10; }); });
  return evos;
}

const EVOS = buildEvos();
const WIN_AT = EVOS[EVOS.length - 1].at + 10;

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

  let newIdx = 0;
  for (let i = 0; i < EVOS.length; i++) { if (count >= EVOS[i].at) newIdx = i; }
  if (newIdx < evoIdx) {
    evoIdx = newIdx;
    applyEvo(EVOS[evoIdx]);
    evoMsg.textContent = `Oh no! Devolved back to ${EVOS[evoIdx].name}! 😱`;
    evoMsg.classList.add('show');
    setTimeout(() => evoMsg.classList.remove('show'), 2800);
  }

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

  if (count >= WIN_AT) {
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
  } else if (count < WIN_AT) {
    count = WIN_AT;
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
  if ((e.code === 'Space' || e.key === ' ') && !winOverlay.classList.contains('show') && !document.getElementById('pinOverlay').classList.contains('show') && !document.getElementById('gateOverlay')) {
    e.preventDefault(); window.eatSpoon();
  }
});
document.addEventListener('click', e => {
  if (!winOverlay.classList.contains('show') && !e.target.closest('#restartBtn') && !e.target.closest('#camPanel') && !e.target.closest('#breakBtn') && !e.target.closest('#skipBtn') && !e.target.closest('#pinOverlay') && !e.target.closest('#lockBtn') && !e.target.closest('#gateOverlay')) {
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
