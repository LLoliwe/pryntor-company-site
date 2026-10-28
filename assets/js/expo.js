/* Original Pryntor exhibition. No dependencies, trackers or external requests.
   Native HTML-in-Canvas is an optional renderer; the same DOM is the fallback.
   Spec: https://wicg.github.io/html-in-canvas/ (checked 28 October 2026). */
const body = document.body;
const plane = document.getElementById('plane');
const world = document.getElementById('world');
const tiles = [...plane.querySelectorAll('.tile')];
const buttons = [...document.querySelectorAll('[data-view]')];
const motion = document.getElementById('motion');
const status = document.getElementById('renderer-status');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 600px)');
const W = 1450, H = 900;
let selected = -1, motionOn = !reduce.matches, renderer = null;
const content = [
  ['01 / PROTOTYPE', 'Ideas you can use.', 'Original tools and interfaces, developed around the people who will use them. We are turning ideas into software and web prototypes people can try.', 'Explore our work', 'index.html#work'],
  ['02 / PROTOTYPE', 'Learn by doing.', 'Interactive experiences that give learners a way to explore ideas for themselves. Our early teaching and learning prototypes make concepts more tangible.', 'Explore the work in development', 'index.html#ventures'],
  ['03 / RESEARCH', 'Ask better questions.', 'Research into how AI systems reason, where they fail and how to test them more carefully. These are evaluation experiments, not claims of validated performance.', 'How we test ideas', 'method.html#test'],
  ['04 / RESEARCH', 'Make it move.', 'Original stories, visual worlds and new ways to bring them to life. We are exploring characters, visual language and ways to tell a story.', 'Explore the work in development', 'index.html#ventures'],
  ['05 / SIMULATION ONLY', 'Movement. Under study.', 'Experiments in movement and control, explored in simulated environments. We study how control systems behave in simulation; this is not deployed robotics.', 'How we develop the work', 'method.html'],
];
const overview = ['00 / THE EXHIBITION', 'Useful ideas. Taking shape.', 'Our work spans prototypes, research and simulation. These are areas we are exploring, not products available to buy.', 'Discover our method', 'method.html'];
function coordinates(tile) { return [Number(tile.dataset.x), Number(tile.dataset.y)]; }
function placeInDOM() {
  tiles.forEach(tile => {
    plane.append(tile);
    const [x, y] = coordinates(tile);
    tile.style.transform = `translate(${x}px, ${y}px)`;
    tile.removeAttribute('drawable');
  });
}
function camera() {
  const width = world.clientWidth, height = world.clientHeight;
  if (!width || !height) return;
  if (selected < 0) {
    const scale = Math.min(width / (W + 100), height / (H + 160));
    plane.style.transform = `translate(-50%, -50%) scale(${scale}) rotateX(24deg) rotateZ(-13deg)`;
  } else {
    const [x, y] = coordinates(tiles[selected]);
    const scale = Math.min((width - 44) / 430, (height - 50) / 350, 1.35);
    plane.style.transform = `translate(-50%, -50%) scale(${scale}) translate(${W / 2 - x - 215}px, ${H / 2 - y - 175}px)`;
  }
}
function select(index, updateHash = true) {
  selected = index;
  const data = selected < 0 ? overview : content[selected];
  document.getElementById('detail-index').textContent = data[0];
  document.getElementById('detail-title').textContent = data[1];
  document.getElementById('detail-copy').textContent = data[2];
  const link = document.getElementById('detail-link');
  link.replaceChildren(document.createTextNode(data[3] + ' '));
  const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); link.append(arrow);
  link.setAttribute('href', data[4]);
  document.getElementById('position').textContent = selected < 0 ? 'Overview' : `${selected + 1} / ${tiles.length}`;
  buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i - 1 === selected)));
  tiles.forEach((tile, i) => tile.classList.toggle('selected', i === selected));
  if (updateHash) {
    // replaceState avoids native fragment scrolling inside the transformed scene.
    try { history.replaceState(null, '', selected < 0 ? location.pathname : '#' + tiles[selected].id); } catch { /* Sandboxed previews can disallow history. */ }
  }
  camera();
  renderer?.request();
}
function fromHash() { select(tiles.findIndex(tile => '#' + tile.id === location.hash), false); }
function setMotion(on) { motionOn = on; body.classList.toggle('motion-off', !on); motion.setAttribute('aria-pressed', String(on)); motion.textContent = on ? 'Motion on' : 'Motion off'; }

/* Keep initialization reversible: failure of an experimental API must never
   leave a blank exhibition or strand a keyboard focus target in a canvas. */
function enhanceCanvas() {
  const canvas = document.createElement('canvas');
  let ctx;
  try { ctx = canvas.getContext('2d'); } catch { return; }
  if (!ctx || typeof ctx.drawElementImage !== 'function' || typeof canvas.requestPaint !== 'function') return;
  if (!('layoutSubtree' in canvas) && !('content' in canvas)) return;
  canvas.setAttribute('layoutsubtree', ''); // Older Chromium developer trials.
  canvas.setAttribute('content', 'drawable'); // Current proposal.
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  let stopped = false, painted = false, timer;
  function fallback() {
    if (stopped) return;
    stopped = true; clearTimeout(timer); canvas.onpaint = null;
    const focused = document.activeElement;
    placeInDOM(); canvas.remove(); renderer = null;
    body.dataset.renderer = 'html'; status.textContent = 'HTML & CSS view. All exhibits and controls are available.';
    if (tiles.includes(focused)) focused.focus({ preventScroll: true });
  }
  canvas.onpaint = () => {
    if (stopped || document.hidden) return;
    try {
      ctx.resetTransform(); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.scale(dpr, dpr);
      tiles.forEach(tile => {
        const [x, y] = coordinates(tile);
        const transform = ctx.drawElementImage(tile, x, y, 430, 350);
        // Legacy API returns a DOMMatrix. Current API updates geometry itself.
        if (transform && typeof transform.toString === 'function') tile.style.transform = transform.toString();
      });
      if (!painted) {
        painted = true; clearTimeout(timer); body.dataset.renderer = 'html-in-canvas';
        status.textContent = 'HTML-in-Canvas is active. The browser is drawing these live HTML exhibits into a canvas.';
      }
    } catch { fallback(); }
  };
  try {
    tiles.forEach(tile => { tile.style.transform = ''; tile.setAttribute('drawable', ''); canvas.append(tile); });
    plane.append(canvas);
    renderer = { request() { if (!stopped && !document.hidden) { try { canvas.requestPaint(); } catch { fallback(); } } }, fallback };
    canvas.addEventListener('contextlost', fallback);
    timer = setTimeout(() => { if (!painted) fallback(); }, 1600);
    renderer.request();
  } catch { fallback(); }
}

placeInDOM();
body.classList.add('enhanced');
body.dataset.renderer = 'html';
status.textContent = 'HTML & CSS view. All exhibits and controls are available.';
document.querySelector('.expo-tools').hidden = false;
setMotion(motionOn);
buttons.forEach((button, i) => button.addEventListener('click', () => select(i - 1)));
tiles.forEach((tile, index) => {
  tile.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); select(index);
  });
  // Keyboard access brings each spatial link into view instead of offscreen.
  tile.addEventListener('focus', () => { if (body.classList.contains('keyboard-input')) select(index); });
});
document.getElementById('next').addEventListener('click', () => select((selected + 1) % tiles.length));
document.getElementById('previous').addEventListener('click', () => select(selected <= 0 ? tiles.length - 1 : selected - 1));
document.getElementById('reset').addEventListener('click', () => select(-1));
motion.addEventListener('click', () => setMotion(!motionOn));
reduce.addEventListener('change', event => setMotion(!event.matches));
document.addEventListener('keydown', event => {
  body.classList.add('keyboard-input');
  if (event.key === 'Escape') { select(-1); buttons[0].focus(); }
});
document.addEventListener('pointerdown', () => body.classList.remove('keyboard-input'), { passive: true });
addEventListener('hashchange', fromHash);
if ('ResizeObserver' in window) new ResizeObserver(camera).observe(world);
else addEventListener('resize', camera);
narrow.addEventListener('change', camera);
fromHash();
enhanceCanvas();
document.fonts.ready.then(() => renderer?.request());
tiles.forEach(tile => tile.querySelectorAll('img').forEach(img => img.addEventListener('load', () => renderer?.request())));
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderer?.request(); });
addEventListener('beforeprint', () => renderer?.fallback());
