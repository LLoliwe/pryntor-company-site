import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {samples,evaluateThreshold,armPose,wavePath,blockPosition,armTargets,reachesTarget} from '../assets/js/expo-model.mjs';
import {mountCanvas} from '../assets/js/expo-renderer.mjs';

test('confidence filtering counts errors, handles ties, all and none',()=>{
  assert.deepEqual(evaluateThreshold(70).passed.map(s=>s.id),['A','B','C','D']);
  assert.equal(evaluateThreshold(70).errors,2);
  assert.equal(evaluateThreshold(91).errors,1);
  assert.equal(evaluateThreshold(0).passed.length,8);
  assert.equal(evaluateThreshold(100).passed.length,0);
  for(let threshold=0;threshold<=100;threshold++){
    const r=evaluateThreshold(threshold);
    assert.equal(r.passed.length+r.held.length,samples.length);
    assert.ok(r.passed.every(s=>s.confidence>=threshold));
    assert.ok(r.held.every(s=>s.confidence<threshold));
    assert.ok(r.errors<=r.passed.length);
  }
});
test('forward kinematics reaches known poses and remains within physical reach',()=>{
  assert.deepEqual(armPose(0,0).tip,{x:290,y:0});
  const up=armPose(90,0).tip;assert.ok(Math.abs(up.x)<1e-10);assert.equal(up.y,290);
  const folded=armPose(0,180).tip;assert.equal(folded.x,30);assert.ok(Math.abs(folded.y)<1e-10);
  for(let a=0;a<=160;a+=5)for(let b=-150;b<=150;b+=5){const {tip}=armPose(a,b);assert.ok(Number.isFinite(tip.x)&&Number.isFinite(tip.y));assert.ok(Math.hypot(tip.x,tip.y)<=290.000001);}
});
test('wave output is finite, deterministic and constrained by amplitude',()=>{
  for(const frequency of [.5,2,5])for(const amplitude of [10,60,120]){
    const path=wavePath(frequency,amplitude,.3),ys=[...path.matchAll(/[ML][\d.]+,(-?[\d.]+)/g)].map(m=>Number(m[1]));
    assert.equal(ys.length,161);assert.ok(ys.every(y=>y>=245-amplitude-.01&&y<=245+amplitude+.01));
    assert.equal(wavePath(frequency,amplitude,.3),path);
  }
  assert.notEqual(wavePath(2,60,0),wavePath(2,60,1));
});
test('assembly can be scattered and returned exactly without drift',()=>{
  for(let i=0;i<36;i++){
    const origin=blockPosition(i,0),scatter=blockPosition(i,100);
    assert.notDeepEqual(scatter,origin);assert.deepEqual(blockPosition(i,0),origin);
    assert.deepEqual(blockPosition(i,-20),origin);assert.deepEqual(blockPosition(i,200),scatter);
    for(const value of Object.values(scatter))assert.ok(Number.isFinite(value));
  }
});
function rendererHarness(mode='modern'){
  let canvas,observer;const reports=[],draws=[],timers=[];
  class Node{
    constructor(){this.children=[];this.style={};this.attrs={};this.events={};this.clientWidth=800;this.offsetHeight=600;this.width=300;this.height=150;}
    get nextSibling(){return this.parent?.children[this.parent.children.indexOf(this)+1]||null;}
    append(child){child.remove();child.parent=this;this.children.push(child);}
    insertBefore(child,next){child.remove();child.parent=this;const i=this.children.indexOf(next);if(i<0)this.children.push(child);else this.children.splice(i,0,child);}
    remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}}
    contains(child){return child===this||this.children.some(c=>c.contains(child));}
    setAttribute(k,v){this.attrs[k]=v;}
    removeAttribute(k){delete this.attrs[k];}
    addEventListener(k,fn){this.events[k]=fn;}
    focus(){this.focused=true;}
  }
  const host=new Node(),element=new Node(),after=new Node(),input=new Node();element.append(input);host.append(element);host.append(after);
  const env={devicePixelRatio:3,document:{hidden:false,activeElement:input,createElement(){canvas=new Node();const ctx={resetTransform(){},clearRect(){},drawElementImage(...args){if(mode==='draw-error')throw Error();draws.push(args);}};canvas.getContext=()=>mode==='no-context'?null:ctx;if(mode!=='unsupported'){canvas.content='drawable';canvas.requestPaint=()=>{if(mode==='request-error')throw Error();if(mode!=='no-paint')canvas.onpaint?.();};}return canvas;}},setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},ResizeObserver:class{constructor(fn){this.fn=fn;observer=this;}observe(){}disconnect(){this.disconnected=true;}}};
  const renderer=mountCanvas(host,element,value=>reports.push(value),env);
  return {host,element,after,input,env,canvas,renderer,reports,draws,timers,get observer(){return observer;}};
}
test('native renderer uses the live subtree, capped pixels and resizing (API double)',()=>{
  const h=rendererHarness();assert.equal(h.reports.at(-1),true);assert.equal(h.canvas.width,1600);assert.equal(h.canvas.height,1200);assert.equal(h.draws[0][0],h.element);assert.equal(h.element.parent,h.canvas);
  h.host.clientWidth=390;h.observer.fn();assert.equal(h.canvas.width,780);assert.equal(h.element.style.width,'390px');
  h.renderer.restore();assert.equal(h.host.children[0],h.element);assert.equal(h.host.children[1],h.after);assert.equal(h.input.focused,true);assert.equal(h.observer.disconnected,true);
});
for(const mode of ['unsupported','no-context','draw-error','request-error','no-paint'])test(`native ${mode} leaves real controls in readable HTML (API double)`,()=>{
  const h=rendererHarness(mode);if(mode==='no-paint')h.timers.forEach(fn=>fn());
  assert.equal(h.element.parent,h.host);assert.equal(h.host.children[0],h.element);assert.equal(h.host.children[1],h.after);assert.ok(!h.reports.includes(true));
});
test('context loss preserves focused input and stops further painting (API double)',()=>{
  const h=rendererHarness();h.canvas.events.contextlost();const count=h.draws.length;h.renderer.request();assert.equal(h.draws.length,count);assert.equal(h.element.parent,h.host);assert.equal(h.input.focused,true);assert.equal(h.reports.at(-1),false);
});
test('page resources exist and experiments make no remote requests or persist input',()=>{
  const html=readFileSync(new URL('../expo.html',import.meta.url),'utf8');
  for(const m of html.matchAll(/(?:href|src)="([^"#]+)"/g))if(!m[1].includes(':'))assert.ok(existsSync(new URL('../'+m[1].split('#')[0],import.meta.url)),m[1]);
  for(const file of ['expo.js','expo-model.mjs','expo-renderer.mjs'])assert.doesNotMatch(readFileSync(new URL('../assets/js/'+file,import.meta.url),'utf8'),/\b(fetch|XMLHttpRequest|localStorage|sendBeacon|innerHTML)\b/);
  assert.ok(html.includes("connect-src 'none'"));
});


test('all robot targets are reachable and success uses a bounded geometric tolerance',()=>{
  for(const target of armTargets){
    const pose=armPose(target.shoulder,target.elbow);
    assert.equal(reachesTarget(pose,pose),true);
    assert.equal(reachesTarget({tip:{x:pose.tip.x+18,y:pose.tip.y}},pose),true);
    assert.equal(reachesTarget({tip:{x:pose.tip.x+19,y:pose.tip.y}},pose),false);
    assert.ok(290+pose.tip.x>=24&&290+pose.tip.x<=776);
    assert.ok(330-pose.tip.y>=24&&330-pose.tip.y<=496);
  }
  assert.equal(reachesTarget(armPose(60,-60),armPose(80,-70)),false);
});
test('fictional answers include checkable questions and accurate correction text',()=>{
  assert.equal(samples.find(s=>s.id==='B').question,'12 × 3');
  assert.equal(samples.find(s=>s.id==='B').expected,36);
  assert.equal(samples.find(s=>s.id==='D').expected,5);
  for(const sample of samples){assert.ok(sample.question.length>0);assert.equal(sample.correct,sample.answer===sample.expected);}
});
