import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../assets/js/expo.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../expo.html', import.meta.url), 'utf8');
function harness(mode = 'unsupported', hash = '') {
  const ids = {}, handlers = {}, timers = [], draws = [];
  class Element {
    constructor(id = '', tagName = 'DIV') {
      this.id = id; this.tagName = tagName; this.attrs = {}; this.dataset = {}; this.style = {}; this.children = []; this.events = {}; this.textContent = ''; this.hidden = false;
      const classes = new Set(); this.classList = { add: (...v) => v.forEach(x => classes.add(x)), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: (x,on) => on ? classes.add(x) : classes.delete(x) };
    }
    append(n) { n.parent?.children.splice(n.parent.children.indexOf(n), 1); this.children.push(n); n.parent = this; }
    remove() { this.parent?.children.splice(this.parent.children.indexOf(this),1); this.parent = null; }
    setAttribute(k,v) { this.attrs[k] = v; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(k,fn) { (this.events[k] ||= []).push(fn); }
    dispatch(k,event = {}) { for (const fn of this.events[k] || []) fn(event); }
    querySelectorAll() { return []; }
    replaceChildren(...n) { this.children = n; }
    focus() { document.activeElement = this; this.dispatch('focus'); }
  }
  for (const id of ['plane','world','motion','renderer-status','detail-index','detail-title','detail-copy','detail-link','position','previous','next','reset']) ids[id] = new Element(id);
  ids.world.clientWidth = 1000; ids.world.clientHeight = 590;
  const tiles = [...html.matchAll(/class="tile [^"]+" id="([^"]+)"[^>]+data-x="(\d+)" data-y="(\d+)"/g)].map(m => { const el = new Element(m[1], 'A'); el.dataset = {x:m[2],y:m[3]}; ids.plane.append(el); return el; });
  const buttons = Array.from({length:6}, () => new Element('', 'BUTTON'));
  const tools = new Element();
  ids.plane.querySelectorAll = () => tiles;
  let canvas;
  const document = {
    body:new Element('body'), hidden:false, activeElement:null,
    getElementById: id => ids[id], querySelectorAll: () => buttons, querySelector: () => tools,
    createTextNode: text => ({textContent:text}), fonts:{ready:Promise.resolve()},
    addEventListener: (k,fn) => handlers[k] = fn,
    createElement(tag) {
      const e = new Element('',tag.toUpperCase());
      if (tag === 'canvas') {
        canvas = e;
        const ctx = {resetTransform(){},clearRect(){},scale(){}};
        e.getContext = () => mode === 'no-context' ? null : ctx;
        if (!['unsupported','no-context'].includes(mode)) {
          e.content = 'drawable';
          ctx.drawElementImage = (tile,x,y,w,h) => { if (mode === 'draw-error') throw new Error('experimental API mismatch'); draws.push([tile.id,x,y,w,h]); return mode === 'legacy' ? {toString:()=>'matrix(1,0,0,1,30,80)'} : undefined; };
          e.requestPaint = () => { if (mode === 'request-error') throw new Error('unavailable'); if (mode !== 'no-paint') e.onpaint?.(); };
        }
      }
      return e;
    }
  };
  const context = {document,window:{},devicePixelRatio:3,location:{hash,pathname:'/expo.html'},history:{replaceState(a,b,url){context.location.hash=url.startsWith('#')?url:'';}},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:(k,fn)=>handlers[k]=fn,setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){}, console};
  context.window = context;
  vm.runInNewContext(source,context);
  return {ids,tiles,buttons,document,canvas,draws,timers,context,handlers};
}
test('unsupported browser keeps all five interactive DOM exhibits and exact destinations',()=>{
  const h=harness(); assert.equal(h.document.body.dataset.renderer,'html'); assert.equal(h.tiles.length,5);
  h.buttons[3].dispatch('click'); assert.equal(h.ids['detail-title'].textContent,'Ask better questions.'); assert.equal(h.ids['detail-link'].attrs.href,'method.html#test');
  assert.match(h.ids.plane.style.transform,/translate\(-480px, 175px\)/); assert.equal(h.context.location.hash,'#evaluation');
  h.ids.next.dispatch('click'); assert.equal(h.ids.position.textContent,'4 / 5');
  h.ids.reset.dispatch('click'); assert.equal(h.ids.position.textContent,'Overview');
  h.ids.previous.dispatch('click'); assert.equal(h.ids.position.textContent,'5 / 5');
  h.ids.next.dispatch('click'); assert.equal(h.ids.position.textContent,'1 / 5');
});
test('deep links, keyboard focus, Escape and motion toggle preserve navigation',()=>{
  const h=harness('unsupported','#robotics'); assert.equal(h.ids.position.textContent,'5 / 5');
  h.handlers.keydown({key:'Tab'});h.tiles[1].focus(); assert.equal(h.ids.position.textContent,'2 / 5');
  h.handlers.keydown({key:'Escape'}); assert.equal(h.ids.position.textContent,'Overview'); assert.equal(h.document.activeElement,h.buttons[0]);
  h.ids.motion.dispatch('click'); assert.equal(h.ids.motion.attrs['aria-pressed'],'false'); assert.ok(h.document.body.classList.contains('motion-off'));
});
test('modern API adapter draws actual HTML nodes and reports active only after paint (API double)',()=>{
  const h=harness('modern');assert.equal(h.document.body.dataset.renderer,'html-in-canvas'); assert.equal(h.draws.length,5);
  assert.deepEqual(h.draws[0],['software',30,80,430,350]); assert.ok(h.tiles.every(t=>t.parent===h.canvas));
  assert.equal(h.canvas.attrs.content,'drawable');assert.equal(h.canvas.width,2175);assert.equal(h.canvas.height,1350);
});
test('legacy adapter synchronises the DOM transform (API double)',()=>{const h=harness('legacy');assert.equal(h.tiles[0].style.transform,'matrix(1,0,0,1,30,80)');});
for(const mode of ['draw-error','request-error','no-context','no-paint'])test(`${mode} restores readable DOM and working controls (API double)`,()=>{
  const h=harness(mode);if(mode==='no-paint')h.timers.forEach(fn=>fn());
  assert.equal(h.document.body.dataset.renderer,'html');assert.ok(h.tiles.every(t=>t.parent===h.ids.plane));
  h.buttons[4].dispatch('click');assert.equal(h.ids['detail-title'].textContent,'Make it move.');
});
test('context loss preserves a focused exhibit; print restores printable DOM (API double)',()=>{
  const h=harness('modern');h.document.activeElement=h.tiles[2];h.canvas.dispatch('contextlost');
  assert.equal(h.document.activeElement,h.tiles[2]);assert.equal(h.document.body.dataset.renderer,'html');
  const p=harness('modern');p.handlers.beforeprint();assert.ok(p.tiles.every(t=>t.parent===p.ids.plane));
});
test('new page has only real local resources and no network/data collection code',()=>{
  for(const m of html.matchAll(/(?:href|src)="([^"#]+)"/g))if(!m[1].includes(':'))assert.ok(existsSync(new URL('../'+m[1].split('#')[0],import.meta.url)),m[1]);
  assert.doesNotMatch(source,/\b(fetch|XMLHttpRequest|localStorage|sendBeacon)\b/);
  assert.ok(html.includes('connect-src \'none\''));
});
