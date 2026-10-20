import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {buildLattice,stepLattice,evaluateGate,applyImpulse,cinemaProjection,sceneSeed,captureSignal,sceneCue,composeJourney} from '../experience-engine.mjs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(join(root,'experience.html'),'utf8');
const css=readFileSync(join(root,'experience.css'),'utf8');
const app=readFileSync(join(root,'experience-app.mjs'),'utf8');

const approved=evaluateGate({evidence:82,repeatability:86,rights:true});
test('evidence gate passes only when all three declared inputs clear the explicit thresholds',()=>{
  assert.equal(approved.status,'CANDIDATE');assert.equal(approved.firstError,null);
  assert.equal(evaluateGate({evidence:69,repeatability:99,rights:true}).firstError,'evidence');
  assert.equal(evaluateGate({evidence:99,repeatability:74,rights:true}).firstError,'repeatability');
  assert.equal(evaluateGate({evidence:99,repeatability:99,rights:false}).firstError,'rights');
  assert.equal(evaluateGate({evidence:70,repeatability:75,rights:true}).status,'CANDIDATE');
});
test('evidence gate fails closed on unsupported or nonfinite inputs',()=>{
  for(const input of [{evidence:120,repeatability:80,rights:true},{evidence:99,repeatability:99},{evidence:NaN,repeatability:99,rights:true},{evidence:70,repeatability:-1,rights:true},{evidence:'',repeatability:80,rights:true}]){
    assert.throws(()=>evaluateGate(input),{name:'TypeError'});
  }
});
test('spring lattice is connected and references valid endpoints',()=>{
  const sim=buildLattice();assert.equal(sim.points.length,35);assert.equal(sim.cols,7);
  assert.ok(sim.springs.length>50);for(const link of sim.springs){assert.ok(link.a>=0&&link.b<sim.points.length&&link.rest>0);}
  assert.equal(sim.points.filter(p=>p.anchor).length,2);
  assert.throws(()=>buildLattice(0,20),RangeError);
});
test('bounded physics runs 250 frames without numerical explosion or losing anchored positions',()=>{
  const sim=buildLattice();const x=sim.points[0].x,y=sim.points[0].y;
  applyImpulse(sim,2.3);
  let result;
  for(let i=0;i<250;i++)result=stepLattice(sim,1/60,70);
  assert.ok(Number.isFinite(result.energy)&&result.energy<250);
  assert.deepEqual([sim.points[0].x,sim.points[0].y],[x,y]);
  for(const p of sim.points)for(const key of ['x','y','vx','vy'])assert.ok(Number.isFinite(p[key]));
});
test('pointer drag affects selected node without affecting anchored nodes',()=>{
  const sim=buildLattice();const at=sim.points[4];
  stepLattice(sim,1/60,80,{index:4,x:1.3,y:-.8});
  assert.equal(at.x,1.3);assert.equal(at.y,-.8);
  assert.equal(sim.points[0].vx,0);
});
test('lens changes projected geometry and seeds repeat deterministically',()=>{
  const p={x:1,y:2,z:0};
  const a=cinemaProjection(p,35,0,{width:800,height:600});
  const b=cinemaProjection(p,85,0,{width:800,height:600});
  assert.ok(Math.abs(a.x-b.x)>5);assert.ok(Number.isFinite(a.y));
  for(let i=0;i<50;i++){assert.equal(sceneSeed(i),sceneSeed(i));assert.ok(sceneSeed(i)>=0&&sceneSeed(i)<1);}
});
test('standalone immersive route has three usable modes, local assets and release holds',()=>{
  for(const file of ['experience-engine.mjs','experience-app.mjs','experience.css'])assert.ok(existsSync(join(root,file)));
  for(const id of ['tab-matter','tab-decision','tab-cinema','scene','impulse','tension','evidence','repeatability','rights','trace','lens','light','sound-toggle','pause-motion','export-trace','save-frame'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/PRIVATE \/ R6 STUDY/);
  assert.match(html,/NO SIGN-UP|NO LOGIN/i);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(app,/new AudioCtor\(\)/);assert.match(app,/addEventListener\('click',async\(\)=>/);
});
test('page does not add a paid, third-party or communications dependency',()=>{
  for(const text of [html,css,app]){
    assert.doesNotMatch(text,/https:\/\/(?:api\.|cdn\.|fonts\.|www\.)/i);
    assert.doesNotMatch(text,/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/);
    assert.doesNotMatch(text,/sk-proj-|sk_live_|BEGIN PRIVATE KEY|AWS_SECRET_ACCESS_KEY/);
  }
  assert.doesNotMatch(html,/<(?:iframe|video|audio)\b/i);
  assert.doesNotMatch(html,/<form\b/i);
});

test('local signal is an actual bounded state sample, not a fabricated approval',()=>{
  const sim=buildLattice();applyImpulse(sim,2.1);
  const energy=stepLattice(sim,1/60,80).energy;
  const first=captureSignal({energy,tension:80,actions:1,nodes:sim.points.length,springs:sim.springs.length});
  const second=captureSignal({energy,tension:80,actions:1,nodes:sim.points.length,springs:sim.springs.length});
  assert.deepEqual(first,second);
  assert.equal(first.kind,'LOCAL_SIMULATION');assert.ok(first.energy>0);
  assert.equal(Object.isFrozen(first),true);
  for (const values of [
    {energy:NaN,tension:70,actions:1,nodes:35,springs:1},
    {energy:-2,tension:70,actions:1,nodes:35,springs:1},
    {energy:1,tension:70,actions:0,nodes:35,springs:1},
    {energy:1,tension:999,actions:2,nodes:35,springs:1}]) {
    assert.throws(()=>captureSignal(values),TypeError);
  }
});
test('hold or candidate creates an original lighting cue without claiming release authority',()=>{
  const hold=evaluateGate({evidence:82,repeatability:86,rights:false});
  const candidate=evaluateGate({evidence:82,repeatability:86,rights:true});
  assert.equal(sceneCue(hold).mood,'UNRESOLVED');
  assert.equal(sceneCue(candidate).mood,'POSSIBILITY');
  assert.notEqual(sceneCue(hold).light,sceneCue(candidate).light);
  assert.equal(sceneCue(null).mood,'UNREVIEWED');
  assert.throws(()=>sceneCue({status:'RELEASED'}),TypeError);
});
test('complete journey enforces causal stage order with no synthetic personal data',()=>{
  const signal=captureSignal({energy:1.5,tension:70,actions:1,nodes:35,springs:94});
  const review=evaluateGate({evidence:82,repeatability:86,rights:false});
  const frame={shot:0,lens:50,light:38,cue:'UNRESOLVED'};
  const journey=composeJourney({signal,gate:review,frame});
  assert.equal(journey.progress,3);
  assert.equal(journey.stages.review.status,'HOLD');
  assert.match(journey.scope,/Not a deployed product/);
  assert.throws(()=>composeJourney({gate:review}),TypeError);
  assert.throws(()=>composeJourney({frame}),TypeError);
  assert.equal(composeJourney({}).progress,0);
});
test('R6 is a continuous three-stage journey with evidence-first portfolio claims and intentional release hold',()=>{
  for(const id of ['carry-signal','carry-readout','signal-ticket','advance-frame','cinema-ticket','finish-journey',
    'receipt-matter','receipt-decision','receipt-cinema','export-journey','reset-journey','journey-result']) {
    assert.match(html,new RegExp(`id="${id}"`));
  }
  for(const name of ['ZOWIBO','LVL7','Show Your Working','Pryntor Robotics','Pryntor Studios','Before the World Wakes']) {
    assert.ok(html.includes(name),`Missing honest company work ${name}`);
  }
  assert.match(html,/not a production artificial-intelligence system/i);
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(app,/captureSignal\(/);assert.match(app,/composeJourney\(/);assert.match(app,/sceneCue\(/);
  assert.match(app,/const doc=composeJourney\(\{signal:journey\.signal,gate:journey\.review,frame:journey\.direction\}\)/);
  assert.doesNotMatch(html,/(?:analytics|checkout|collect personal details)\s*=\s*"/i);
});