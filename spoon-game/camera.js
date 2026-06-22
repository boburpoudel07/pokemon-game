/* ============================================================
   camera.js — MediaPipe Hands palm detection
   Detects open palm → fills charge ring → calls window.eatSpoon()
   No server required — runs entirely in the browser.
   ============================================================ */

const SEND_INTERVAL_MS = 50;    // run inference every 50ms → ~20fps
const CHARGE_RATE = 1 / 6;      // fills in ~6 frames ≈ 0.3s of sustained detection
const DRAIN_RATE  = 1 / 15;     // drains slowly — tolerates brief misses without resetting
const EAT_COOLDOWN_MS = 3000;   // minimum time between eats

/* ── DOM ── */
const camBtn        = document.getElementById('camBtn');
const camFeedWrap   = document.getElementById('camFeedWrap');
const camVideo      = document.getElementById('camVideo');
const camCanvas     = document.getElementById('camCanvas');
const camFlashEl    = document.getElementById('camFlash');
const camDot        = document.getElementById('camDot');
const camStatusText = document.getElementById('camStatusText');
const camChargeBar  = document.getElementById('camChargeBar');
const chargeRingEl  = document.getElementById('chargeRing');

/* ── STATE ── */
let hands       = null;
let cameraOn    = false;
let detectLoop  = null;
let chargeLevel = 0;
let lastEatMs   = 0;

/* ── HELPERS ── */
function setCamStatus(dotClass, text) {
  camDot.className = 'cam-dot ' + dotClass;
  camStatusText.textContent = text;
}

function setCharge(level) {
  chargeLevel = level;
  chargeRingEl.style.setProperty('--charge', level.toFixed(3));
  chargeRingEl.classList.toggle('active', level > 0.02);
  camChargeBar.style.width = (level * 100).toFixed(1) + '%';
  camChargeBar.classList.toggle('full', level >= 1);
}

function flashCamera() {
  camFlashEl.classList.remove('ping');
  void camFlashEl.offsetWidth;
  camFlashEl.classList.add('ping');
}

/* ── HAND SKELETON CONNECTIONS ── */
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
];

/* ── DRAW ── */
function drawFrame(landmarks, detected) {
  const W = camCanvas.width, H = camCanvas.height;
  const ctx = camCanvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const r = Math.min(W, H) * 0.28;
  const charging = chargeLevel > 0.02;

  /* target zone circle */
  ctx.setLineDash([7, 5]);
  ctx.lineWidth   = 2.5;
  ctx.strokeStyle = charging ? '#00ff88' : 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font      = 'bold 12px sans-serif';
  ctx.fillStyle = charging ? '#00ff88' : 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.fillText('✋ Hold palm here', W / 2, H / 2 + r + 16);

  /* charge arc sweep */
  if (chargeLevel > 0.01) {
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth   = 4;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, r, -Math.PI / 2, -Math.PI / 2 + chargeLevel * Math.PI * 2);
    ctx.stroke();
  }

  /* hand skeleton — mirror x to match CSS-flipped video */
  if (landmarks) {
    const pts = landmarks.map(lm => ({ x: (1 - lm.x) * W, y: lm.y * H }));

    ctx.strokeStyle = '#00ff8888';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const [a, b] of CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
      ctx.stroke();
    }

    ctx.fillStyle = detected ? '#00ff88' : 'rgba(255,255,255,0.6)';
    for (const pt of pts) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ── OPEN PALM CHECK ── */
function isOpenPalm(lm) {
  // fingertip y < pip y means finger is extended (y=0 at top in normalized coords)
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  let extended = 0;
  for (let i = 0; i < 4; i++) {
    if (lm[tips[i]].y < lm[pips[i]].y) extended++;
  }
  return extended >= 3;
}

/* ── MEDIAPIPE CALLBACK ── */
function onResults(results) {
  if (window.gameWon) return;

  const lm       = results.multiHandLandmarks && results.multiHandLandmarks[0];
  const detected = lm ? isOpenPalm(lm) : false;

  const newCharge = detected
    ? Math.min(1, chargeLevel + CHARGE_RATE)
    : Math.max(0, chargeLevel - DRAIN_RATE);
  setCharge(newCharge);
  drawFrame(lm || null, detected);

  if (detected && newCharge < 1) {
    setCamStatus('charging', `Charging… ${Math.round(newCharge * 100)}%`);
  } else if (!detected && chargeLevel < 0.05) {
    setCamStatus('ready', 'Show ✋ open palm!');
  }

  const now = Date.now();
  if (newCharge >= 1 && now - lastEatMs > EAT_COOLDOWN_MS) {
    lastEatMs = now;
    setCharge(0);
    flashCamera();
    setCamStatus('found', 'Nom! 🎉');
    setTimeout(() => setCamStatus('ready', 'Show ✋ open palm!'), 1200);
    window.eatSpoon();
  }
}

/* ── DETECT LOOP ── */
function startDetectLoop() {
  if (detectLoop) return;
  detectLoop = setInterval(async () => {
    if (!cameraOn || !hands || camVideo.readyState < 2 || window.gameWon) return;
    await hands.send({ image: camVideo });
  }, SEND_INTERVAL_MS);
}

function stopDetectLoop() {
  clearInterval(detectLoop);
  detectLoop = null;
}

/* ── INIT MEDIAPIPE ── */
async function initHands() {
  hands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,          // 0 = lite model, fastest
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  hands.onResults(onResults);
  await hands.initialize();
}

/* ── ENABLE / DISABLE ── */
async function enableCamera() {
  camBtn.disabled = true;
  setCamStatus('loading', 'Loading hand detector…');
  camFeedWrap.style.display = 'block';

  try {
    await initHands();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
    });
    camVideo.srcObject = stream;
    await camVideo.play();

    camVideo.addEventListener('loadedmetadata', () => {
      camCanvas.width  = camVideo.videoWidth  || 320;
      camCanvas.height = camVideo.videoHeight || 240;
    }, { once: true });

    cameraOn = true;
    camBtn.textContent = 'Disable';
    camBtn.disabled = false;
    setCamStatus('ready', 'Show ✋ open palm!');
    startDetectLoop();
  } catch (err) {
    camFeedWrap.style.display = 'none';
    const msg = err.name === 'NotAllowedError' ? 'Camera permission denied' : err.message;
    setCamStatus('error', '⚠️ ' + msg);
    camBtn.disabled = false;
  }
}

function disableCamera() {
  cameraOn = false;
  stopDetectLoop();
  setCharge(0);
  drawFrame(null, false);
  if (camVideo.srcObject) { camVideo.srcObject.getTracks().forEach(t => t.stop()); camVideo.srcObject = null; }
  camFeedWrap.style.display = 'none';
  setCamStatus('idle', 'Camera off — click Enable to start');
  camBtn.textContent = 'Enable';
}

camBtn.addEventListener('click', () => {
  if (!cameraOn) enableCamera(); else disableCamera();
});
