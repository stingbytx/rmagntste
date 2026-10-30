import * as THREE from '../vendor/three.module.js';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

/* ============================================================
   0. tiny helpers
   ============================================================ */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const isMobile = () => window.innerWidth <= 900;

/* ============================================================
   1. renderer, scene, camera
   ============================================================ */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, .1, 100);

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envRT = pmrem.fromScene(new RoomEnvironment(), .04);
scene.environment = envRT.texture;
pmrem.dispose();

/* lights */
const hemi = new THREE.HemisphereLight(0xfff6ee, 0xd9d2c8, .7);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff3e6, 1.7);
key.position.set(-3, 5, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.radius = 6;
key.shadow.bias = -.0005;
key.shadow.camera.left = -4;
key.shadow.camera.right = 4;
key.shadow.camera.top = 5;
key.shadow.camera.bottom = -3;
key.shadow.camera.near = .5;
key.shadow.camera.far = 20;
scene.add(key);

const rim = new THREE.DirectionalLight(0xfff0e6, 1.2);
rim.position.set(4, 2, -4);
scene.add(rim);

const fill = new THREE.PointLight(0xff9a6a, 2.2, 6);
fill.position.set(-3.2, 1.2, .6);
scene.add(fill);

/* ============================================================
   2. materials
   ============================================================ */
function makeRingTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  const g = x.createConicGradient(-Math.PI * .5, 256, 256);
  const stops = [
    [0.00, '#ff3d8b'], [.08, '#ff5a5f'], [.17, '#ff8a3d'], [.25, '#ffb347'],
    [.33, '#ff8a3d'], [.42, '#ff5a5f'], [.50, '#ff3d8b'], [.58, '#ff5a5f'],
    [.67, '#ff8a3d'], [.75, '#ffb347'], [.83, '#ff8a3d'], [.92, '#ff5a5f'], [1.00, '#ff3d8b']
  ];
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const ringTex = makeRingTexture();

const shell = new THREE.MeshPhysicalMaterial({ color: 0xeeebe6, roughness: .38, clearcoat: .45, clearcoatRoughness: .3, envMapIntensity: .9 });
const shellLight = new THREE.MeshPhysicalMaterial({ color: 0xf8f6f2, roughness: .34, clearcoat: .45, clearcoatRoughness: .3, envMapIntensity: .9 });
const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: .55, metalness: .3, envMapIntensity: .8 });
const deepDark = new THREE.MeshStandardMaterial({ color: 0x0f0f12, roughness: .6, metalness: .25, envMapIntensity: .7 });
const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x2a2928, roughness: .9, metalness: .05 });
const ringMat = new THREE.MeshPhysicalMaterial({
  map: ringTex, emissiveMap: ringTex, emissive: 0xffffff, emissiveIntensity: .22,
  roughness: .5, clearcoat: .35, clearcoatRoughness: .35, metalness: .05, envMapIntensity: .9
});

/* ============================================================
   3. face canvas
   ============================================================ */
const FACE = 512;
const faceCanvas = document.createElement('canvas');
faceCanvas.width = faceCanvas.height = FACE;
const fx = faceCanvas.getContext('2d');
const faceTex = new THREE.CanvasTexture(faceCanvas);
faceTex.colorSpace = THREE.SRGBColorSpace;
faceTex.anisotropy = 4;

let blinkTimer = 0;
let blinkEvery = 2.5 + Math.random() * 3;
let blinkT = -1;
let quoteMix = 0;
let quoteTarget = 0;

function drawFace(dt) {
  // blink scheduling
  blinkTimer += dt;
  if (blinkT < 0 && blinkTimer > blinkEvery) { blinkT = 0; }
  let eye = 1;
  if (blinkT >= 0) {
    blinkT += dt;
    const k = clamp(blinkT / .18, 0, 1);
    eye = 1 - .9 * Math.sin(Math.PI * k);
    if (blinkT > .18) { blinkT = -1; blinkTimer = 0; blinkEvery = 2.5 + Math.random() * 3; }
  }

  quoteMix = clamp(quoteMix + (quoteTarget > quoteMix ? .05 : -.05), 0, 1);

  fx.clearRect(0, 0, FACE, FACE);
  fx.fillStyle = '#000';
  fx.fillRect(0, 0, FACE, FACE);
  fx.shadowColor = 'rgba(255,255,255,.92)';
  fx.shadowBlur = 18;
  fx.fillStyle = '#fff';

  if (quoteMix < 1) {
    fx.globalAlpha = 1 - quoteMix;
    const ry = 38 * eye;
    fx.beginPath(); fx.ellipse(196, 262, 30, ry, 0, 0, Math.PI * 2); fx.fill();
    fx.beginPath(); fx.ellipse(316, 252, 30, ry, 0, 0, Math.PI * 2); fx.fill();
  }
  if (quoteMix > 0) {
    fx.globalAlpha = quoteMix;
    fx.font = '560px "Arial Black", Arial, sans-serif';
    fx.textAlign = 'center';
    fx.textBaseline = 'middle';
    fx.fillText('\u201C', 256, 400);
  }
  fx.globalAlpha = 1;
  fx.shadowBlur = 0;
  faceTex.needsUpdate = true;
}
drawFace(0);

const screenMat = new THREE.MeshPhysicalMaterial({
  color: 0x050506, roughness: .16, clearcoat: 1, clearcoatRoughness: .06,
  emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: 1.6, envMapIntensity: 1
});

/* ============================================================
   4. geometry helpers
   ============================================================ */
function rbox(w, h, d, r, mat) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, Math.min(w, h, d) / 2 - .001)), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function ball(r, mat) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, mat, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function roundedRectPath(w, h, r, path) {
  const x = -w / 2, y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}
function frameGeometry(ow, oh, orad, iw, ih, irad, depth, bevel) {
  const shape = new THREE.Shape();
  roundedRectPath(ow, oh, orad, shape);
  const hole = new THREE.Path();
  roundedRectPath(iw, ih, irad, hole);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 3, curveSegments: 14
  });
  // remap UVs to the frame's own bounds so the gradient wraps around it
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y;
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - bb.min.x) / sx, (pos.getY(i) - bb.min.y) / sy);
  }
  uv.needsUpdate = true;
  return geo;
}

/* ============================================================
   5. robot
   ============================================================ */
const robot = new THREE.Group();
scene.add(robot);

const bodyG = new THREE.Group();
robot.add(bodyG);

/* ---- torso ---- */
const torso = rbox(1.22, 1.12, .92, .24, shell);
bodyG.add(torso);

const chestSlab = rbox(.95, .2, .72, .08, shellLight);
chestSlab.position.set(0, .46, .04);
bodyG.add(chestSlab);

[[-.22, 0xff8a3d], [0, 0xff5a5f], [.22, 0xff3d8b]].forEach(([x, c], i) => {
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(.038, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x120b08, emissive: c, emissiveIntensity: 2.6, roughness: .35 })
  );
  led.position.set(x, .13, .475);
  bodyG.add(led);
});

[-.28, .28].forEach(x => {
  const slot = rbox(.1, .34, .04, .02, deepDark);
  slot.position.set(x, -.14, .468);
  bodyG.add(slot);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.07, .022, 8, 20, Math.PI), dark);
  lip.position.set(x, .045, .47);
  lip.rotation.z = 0;
  lip.castShadow = true;
  bodyG.add(lip);
});

const pelvis = rbox(.7, .28, .6, .09, dark);
pelvis.position.set(0, -.62, 0);
bodyG.add(pelvis);

/* ---- neck ---- */
const neck = cyl(.2, .21, .38, dark);
neck.position.set(0, .72, 0);
bodyG.add(neck);

/* ---- head ---- */
const headPivot = new THREE.Group();
headPivot.position.set(0, .78, 0);
bodyG.add(headPivot);

const head = new THREE.Group();
head.position.set(0, .78, 0);
headPivot.add(head);

const skull = rbox(1.5, 1.42, 1.3, .2, shell);
head.add(skull);

const backBlock = rbox(1.28, 1.14, .9, .18, dark);
backBlock.position.set(0, 0, -.28);
head.add(backBlock);

/* circuit bars */
let seed = 20260117;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
for (let i = 0; i < 26; i++) {
  const horiz = rnd() > .5;
  const w = horiz ? .07 + rnd() * .1 : .024 + rnd() * .016;
  const h = horiz ? .024 + rnd() * .016 : .07 + rnd() * .1;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, .02), deepDark);
  if (rnd() > .45) {
    // back face
    bar.position.set(-.55 + rnd() * 1.1, -.45 + rnd() * .9, -.735);
  } else {
    // top face
    bar.rotation.x = Math.PI / 2;
    bar.position.set(-.55 + rnd() * 1.1, .573, -.62 + rnd() * .5);
  }
  head.add(bar);
}

/* face ring (gradient extruded frame) */
const ringGeo = frameGeometry(1.5, 1.44, .3, 1.08, 1.02, .2, .1, .03);
const faceRing = new THREE.Mesh(ringGeo, ringMat);
faceRing.position.z = .6;
faceRing.castShadow = true;
faceRing.receiveShadow = true;
head.add(faceRing);

/* bezel */
const bezel = new THREE.Mesh(frameGeometry(1.14, 1.1, .24, .96, .9, .17, .04, .012), shellLight);
bezel.position.z = .625;
bezel.castShadow = true;
head.add(bezel);

/* screen */
const screen = rbox(.9, .84, .04, .06, screenMat);
screen.position.set(0, 0, .665);
screen.castShadow = false;
head.add(screen);

/* ears + cable */
[-1, 1].forEach(side => {
  const ear = cyl(.21, .21, .16, shell, 28);
  ear.rotation.z = Math.PI / 2;
  ear.position.set(side * .78, .02, 0);
  head.add(ear);
  const cap = cyl(.15, .15, .02, shellLight, 24);
  cap.rotation.z = Math.PI / 2;
  cap.position.set(side * .872, .02, 0);
  head.add(cap);
});

const cableGeo = new THREE.TorusGeometry(.17, .038, 8, 26, Math.PI);
cableGeo.rotateZ(Math.PI);
cableGeo.rotateY(Math.PI / 2);
const cable = new THREE.Mesh(cableGeo, dark);
cable.position.set(.80, -.60, -.02);
cable.castShadow = true;
head.add(cable);

/* ---- arms ---- */
const arms = [];
function buildArm(side) {
  const g = new THREE.Group();
  g.position.set(side * .63, .3, 0);
  g.rotation.z = side * .16;
  bodyG.add(g);

  g.add(ball(.17, dark));

  const upper = rbox(.3, .46, .32, .12, shell);
  upper.position.y = -.3;
  g.add(upper);

  const elbow = ball(.135, dark);
  elbow.position.y = -.56;
  g.add(elbow);

  const fore = new THREE.Group();
  fore.position.y = -.58;
  fore.rotation.x = -.35;
  g.add(fore);

  const foreArm = rbox(.26, .42, .28, .11, shell);
  foreArm.position.y = -.2;
  fore.add(foreArm);

  const hand = rbox(.27, .22, .3, .08, shellLight);
  hand.position.y = -.44;
  fore.add(hand);

  const thumb = rbox(.09, .15, .1, .035, shellLight);
  thumb.position.set(-side * .13, -.42, .09);
  fore.add(thumb);

  arms.push({ g, fore, side, baseZ: side * .16 });
}
buildArm(-1);
buildArm(1);

/* ---- legs ---- */
function buildLeg(side) {
  const hip = ball(.16, dark);
  hip.position.set(side * .34, -.72, 0);
  bodyG.add(hip);

  const leg = rbox(.36, .5, .38, .13, shell);
  leg.position.set(side * .34, -1.0, 0);
  bodyG.add(leg);

  const ankle = cyl(.15, .15, .1, dark, 20);
  ankle.position.set(side * .34, -1.28, 0);
  bodyG.add(ankle);

  const foot = rbox(.42, .16, .56, .06, shellLight);
  foot.position.set(side * .34, -1.34, .05);
  bodyG.add(foot);
}
buildLeg(-1);
buildLeg(1);

/* ---- pedestal ---- */
const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.6, 1.7), pedestalMat);
pedestal.position.set(0, -2.22, 0);
pedestal.receiveShadow = true;
pedestal.castShadow = true;
robot.add(pedestal);

/* ============================================================
   6. motion
   ============================================================ */
const STATE_INTRO = { z: 11.6, y: 1.1, ly: .55, body: -.42, hy: -.6, hp: .16, hr: .22 };
const STATE_PRODUCT = { z: 6.9, y: 1.95, ly: 1.72, body: -.2, hy: -.06, hp: .04, hr: 0 };

let pointerX = 0, pointerY = 0, smoothPX = 0, smoothPY = 0;
let smoothP = 0;

window.addEventListener('pointermove', e => {
  pointerX = (e.clientX / window.innerWidth) * 2 - 1;
  pointerY = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

const clock = new THREE.Clock();
let t = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), .05);
  t += dt;

  pointerX = clamp(pointerX, -1, 1);
  smoothPX += (pointerX - smoothPX) * .06;
  smoothPY += (pointerY - smoothPY) * .06;

  const rawP = clamp(window.scrollY / window.innerHeight, 0, 2);
  smoothP += (rawP - smoothP) * .08;
  const k = easeInOut(clamp(smoothP, 0, 1));

  const zMul = isMobile() ? 1.25 : 1;
  const camZ = lerp(STATE_INTRO.z, STATE_PRODUCT.z, k) * zMul;
  const camY = lerp(STATE_INTRO.y, STATE_PRODUCT.y, k);
  const lookY = lerp(STATE_INTRO.ly, STATE_PRODUCT.ly, k);

  camera.position.set(smoothPX * .25, camY - smoothPY * .1, camZ);
  camera.lookAt(0, lookY, 0);

  const bodyYaw = lerp(STATE_INTRO.body, STATE_PRODUCT.body, k) + smoothPX * .12;
  robot.rotation.y = bodyYaw;
  robot.position.x = .46 * k;

  const headYaw = lerp(STATE_INTRO.hy, STATE_PRODUCT.hy, k) + smoothPX * .45;
  const headPitch = lerp(STATE_INTRO.hp, STATE_PRODUCT.hp, k) + smoothPY * .18 + Math.sin(t * .9) * .02;
  const headRoll = lerp(STATE_INTRO.hr, STATE_PRODUCT.hr, k) + Math.sin(t * .7) * .02;
  headPivot.rotation.set(headPitch, headYaw, headRoll);

  bodyG.position.y = Math.sin(t * 1.4) * .02;

  arms.forEach(a => {
    a.g.rotation.z = a.baseZ + Math.sin(t * 1.4 + a.side) * .05;
    a.fore.rotation.x = -.35 + Math.sin(t * 1.4 + a.side) * .06;
  });

  // face mode
  quoteTarget = smoothP > 1.55 ? 1 : 0;
  drawFace(dt);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ============================================================
   7. chrome: top bar + nav
   ============================================================ */
const body = document.body;
let barClosed = false;
function syncChrome() {
  const hide = barClosed || window.scrollY > 40;
  body.classList.toggle('chrome-hidden', hide);
}
window.addEventListener('scroll', syncChrome, { passive: true });
document.getElementById('topbarClose').addEventListener('click', () => {
  barClosed = true;
  syncChrome();
});
syncChrome();

/* ============================================================
   9. tab carousel
   ============================================================ */
const TABS = [
  'AI Voicebot', 'Voice Cloning', 'Voice-agent builder', 'Conversation & call analytics',
  'AI Sales assistant', 'Call auditor', 'Speech & sentiment analysis', 'Call insights AI',
  'Voice auditor', 'AI Voicebot'
];
const track = document.getElementById('tabTrack');

TABS.forEach((label, i) => {
  const el = document.createElement('div');
  el.className = 'tab';
  el.innerHTML = `<div class="frame"><i class="cb tl"></i><i class="cb tr"></i><i class="cb bl"></i><i class="cb br"></i></div>
    <span class="num">${String(i + 1).padStart(2, '0')}</span>
    <span class="tl">${label}</span>`;
  track.appendChild(el);
});

let tabIndex = 0;
const tabEls = [...track.children];
function paintTabs() {
  tabEls.forEach((el, i) => {
    el.classList.toggle('active', i === tabIndex);
    el.classList.toggle('passed', i < tabIndex);
  });
}
function moveTabs() {
  tabIndex++;
  if (tabIndex >= TABS.length) {
    track.style.transition = 'none';
    tabIndex = 0;
    track.style.transform = 'translateX(0)';
    paintTabs();
    // force reflow so the next transition works
    void track.offsetWidth;
    track.style.transition = '';
    return;
  }
  const step = isMobile() ? 78 : 33;
  track.style.transform = `translateX(-${tabIndex * step}vw)`;
  paintTabs();
}
paintTabs();
setInterval(moveTabs, 2400);
window.addEventListener('resize', () => {
  const step = isMobile() ? 78 : 33;
  track.style.transition = 'none';
  track.style.transform = `translateX(-${tabIndex * step}vw)`;
  void track.offsetWidth;
  track.style.transition = '';
});

/* ============================================================
   10. reviews
   ============================================================ */
const REVIEWS = [
  {
    quote: '\u201CBooking every inbound call used to bottleneck our own sales team, Remy Agent handles it in seconds.\u201D',
    name: 'Ilan Brooks',
    role: 'Founder of Halden Capital'
  },
  {
    quote: 'Remy Agent is a vital asset for busy support teams, handling every conversation effortlessly.',
    name: 'Rhea Okafor',
    role: 'Co-founder of Tessel Network'
  },
  {
    quote: '\u201CThe fastest way we have found to go from a script to a live voice agent.\u201D',
    name: 'Mara Elling',
    role: 'CTO at Northline Labs'
  }
];

let revIndex = 0;
const revName = document.getElementById('revName');
const revRole = document.getElementById('revRole');
const revQuote = document.getElementById('revQuote');
const revGhost = document.getElementById('revGhost');
const fadeEls = [revName, revRole, revQuote, document.querySelector('.tryLine')];

function renderReview(i, animate) {
  const r = REVIEWS[i];
  const apply = () => {
    revName.textContent = r.name;
    revRole.textContent = r.role;
    revQuote.textContent = r.quote;
    revGhost.textContent = REVIEWS[(i + 1) % REVIEWS.length].quote;
    if (animate) fadeEls.forEach(el => el.classList.remove('out'));
  };

  if (animate) {
    fadeEls.forEach(el => el.classList.add('out'));
    setTimeout(apply, 450);
  } else {
    apply();
  }
}
renderReview(0, false);

document.getElementById('revNext').addEventListener('click', () => {
  revIndex = (revIndex + 1) % REVIEWS.length;
  renderReview(revIndex, true);
});
document.getElementById('revPrev').addEventListener('click', () => {
  revIndex = (revIndex - 1 + REVIEWS.length) % REVIEWS.length;
  renderReview(revIndex, true);
});

/* ============================================================
   11. reveal + rail
   ============================================================ */
const railSections = [document.getElementById('intro'), document.getElementById('product'), document.getElementById('reviews')];

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.classList.contains('in')) {
      const rvs = [...entry.target.querySelectorAll('.rv')].filter(el => el.closest('.sec') === entry.target);
      rvs.forEach((el, i) => {
        el.style.transitionDelay = (Math.min(i, 6) * .1) + 's';
      });
      entry.target.classList.add('in');
    }
  });
}, { threshold: .15 });
document.querySelectorAll('main .sec').forEach(s => revealObserver.observe(s));

const railLabel = document.getElementById('railLabel');
const railText = document.getElementById('railText');
const railNames = ['Intro', 'Product', 'Reviews'];

const railObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.intersectionRatio > .5) {
      const idx = railSections.indexOf(entry.target);
      if (idx < 0) return;
      railText.textContent = railNames[idx];
      railLabel.style.transform = `translateY(${(idx * .31) * 270}px)`;
    }
  });
}, { threshold: [.5, .51, .6, .75] });
railSections.forEach(s => railObserver.observe(s));