import {applyImpulse,buildLattice,cinemaProjection,clamp,evaluateGate,sceneSeed,stepLattice,captureSignal,sceneCue,composeJourney} from './experience-engine.mjs';

const $ = id => document.getElementById(id);
const canvas=$('scene');
const context=canvas.getContext('2d',{alpha:false});
const motionMedia=window.matchMedia('(prefers-reduced-motion: reduce)');
const state={mode:'matter',motion:!motionMedia.matches,frame:0,last:0,raf:0,drag:null,hover:-1,lattice:buildLattice(),energy:0,tension:70,gate:null,lens:50,light:65,shot:0,audio:null,audioOn:false,width:0,height:0,dpr:1,visible:true};
// Reflect the OS reduced-motion state before the first browser interaction.
const initialMotionButton=$('pause-motion');
initialMotionButton.setAttribute('aria-pressed',String(!state.motion));
initialMotionButton.textContent=state.motion?'PAUSE MOTION':'RESUME MOTION';
const tabs=[...document.querySelectorAll('[role=tab]')];
const panels=Object.fromEntries(['matter','decision','cinema'].map(key=>[key,$('mode-'+key)]));
const names={matter:'LAB 01 / PHYSICAL RESPONSE',decision:'LAB 02 / EXPLAINABLE GATES',cinema:'LAB 03 / DIRECTABLE FRAMES'};
const twoPi=Math.PI*2;
const journey={actions:0,signal:null,review:null,direction:null};
let localSequence=0;
function text(id,value){$(id).textContent=value;}
function receipt(){
  const stages=composeJourney({signal:journey.signal,gate:journey.review,direction:journey.direction});
  for(const [mode,active] of [['matter',Boolean(journey.signal)],['decision',Boolean(journey.review)],['cinema',Boolean(journey.direction)]]){
    $('chain-'+mode).dataset.complete=String(active);
  }
  text('receipt-matter',journey.signal?`SIGNAL / ${journey.signal.actions} ACTION${journey.signal.actions===1?'':'S'}`:'AWAITING ACTION');
  text('receipt-matter-detail',journey.signal?`${journey.signal.nodes} nodes · ${journey.signal.springs} links · ${journey.signal.energy.toFixed(3)} energy units`:'Send a pulse or move a node.');
  text('receipt-decision',journey.review?`ILLUSTRATIVE ${journey.review.status}`:'NOT EVALUATED');
  text('receipt-decision-detail',journey.review?journey.review.firstError?`First failed: ${journey.review.firstError}`:'All three illustrative criteria passed.':'Illustrative rules, not a model.');
  text('receipt-cinema',journey.direction?`SHOT 0${journey.direction.shot+1} / ${journey.direction.lens} MM`:'NOT DIRECTED');
  text('receipt-cinema-detail',journey.direction?`Key ${journey.direction.light}° · ${journey.direction.cue} treatment`:'Lens, lighting and angle awaiting a choice.');
  text('journey-message',`${stages.progress} of 3 local steps captured. Nothing is sent or stored remotely.`);
}
function countAction(){journey.actions++;journey.signal=null;journey.review=null;journey.direction=null;receipt();}
function showSceneStatus(){
  if(!journey.review)return;
  const cue=sceneCue(journey.review);
  text('cinema-ticket',`CARRIED FROM PART 02 / ${journey.review.status} / ${cue.mood} LIGHTING`);
  $('cinema-ticket').dataset.status=journey.review.status;
}

function tickMarks(w,h){
  const g=context;
  g.lineWidth=.7;
  g.strokeStyle='rgba(131,151,190,.085)';
  for(let i=1;i<11;i++){
    g.beginPath();g.moveTo(w*i/11,0);g.lineTo(w*i/11,h);g.stroke();
  }
  for(let i=1;i<8;i++){
    g.beginPath();g.moveTo(0,h*i/8);g.lineTo(w,h*i/8);g.stroke();
  }
  g.strokeStyle='rgba(221,234,255,.12)';
  g.beginPath();g.arc(w*.5,h*.49,Math.min(w,h)*.36,0,twoPi);g.stroke();
  g.beginPath();g.arc(w*.5,h*.49,Math.min(w,h)*.24,0,twoPi);g.stroke();
}
function background(w,h,flavor='matter'){
  const g=context;
  g.fillStyle='#090d16';g.fillRect(0,0,w,h);
  const cx=flavor==='cinema' ? w*.57 : w*.5;
  const glow=g.createRadialGradient(cx,h*.5,0,cx,h*.54,Math.max(w,h)*.76);
  glow.addColorStop(0,flavor==='decision'?'#1c2338':flavor==='cinema'?'#1d2947':'#192641');
  glow.addColorStop(.55,'#0e1422');glow.addColorStop(1,'#070b12');
  g.fillStyle=glow;g.fillRect(0,0,w,h);
  g.save();tickMarks(w,h);g.restore();
  // Original generative motes, constant seeds and no imported textures.
  for(let i=0;i<72;i++){
    const x=sceneSeed(i+23)*w,y=sceneSeed(i+319)*h,r=.5+sceneSeed(i+727)*1.2;
    g.fillStyle=`rgba(208,222,255,${(.045+sceneSeed(i+910)*.19).toFixed(3)})`;
    g.beginPath();g.arc(x,y,r,0,twoPi);g.fill();
  }
}
function materialPoint(p,w,h){const z=.045*p.x*p.y;return {x:w*.51+p.x*Math.min(w*.155,150),y:h*.51+p.y*Math.min(h*.29,140)+z*20};}
function drawMatter(w,h,t){
  const g=context;
  background(w,h);
  const coords=state.lattice.points.map(p=>materialPoint(p,w,h));
  // Directional falloff on genuinely moving mesh geometry, not an image sequence.
  const centerX=w*.51,centerY=h*.51;
  const outer=g.createRadialGradient(centerX,centerY,2,centerX,centerY,Math.min(w,h)*.67);
  outer.addColorStop(0,'rgba(48,76,144,.23)');outer.addColorStop(.55,'rgba(21,37,77,.08)');outer.addColorStop(1,'rgba(2,5,13,0)');
  g.fillStyle=outer;g.fillRect(0,0,w,h);
  g.save();g.shadowBlur=55;g.shadowColor='rgba(72,106,227,.35)';
  for(let row=0;row<state.lattice.rows-1;row++){
    for(let col=0;col<state.lattice.cols-1;col++){
      const i=row*state.lattice.cols+col,j=i+1,k=i+state.lattice.cols,l=k+1;
      const q=[coords[i],coords[j],coords[l],coords[k]];
      const vx=Math.abs(state.lattice.points[i].vx)+Math.abs(state.lattice.points[l].vx);
      const asymmetry=Math.max(.12,Math.min(.97,.48+vx*.13));
      const warm=(row+col)%4===0;
      const fill=g.createLinearGradient(q[0].x,q[0].y,q[2].x,q[2].y);
      fill.addColorStop(0,warm?'rgba(255,163,116,.68)':'rgba(102,133,235,.72)');
      fill.addColorStop(asymmetry,warm?'rgba(195,74,58,.45)':'rgba(43,75,167,.39)');
      fill.addColorStop(1,'rgba(10,22,56,.55)');
      polygon(q,fill,null);
    }
  }
  g.restore();
  // A second pass provides the tensile structure and makes deformation legible.
  g.lineJoin='round';
  for(const [index,spring] of state.lattice.springs.entries()){
    const a=coords[spring.a],b=coords[spring.b];
    g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);
    g.strokeStyle=index%4===0?'rgba(255,185,151,.40)':'rgba(184,204,255,.29)';
    g.lineWidth=index%4===0?1.4:.68;g.stroke();
  }
  for(let i=0;i<coords.length;i++){
    const {x,y}=coords[i],point=state.lattice.points[i],active=i===state.hover||i===state.drag?.index;
    const radius=point.anchor?4.8:active?8.7:3.7;
    if(active){g.beginPath();g.arc(x,y,24,0,twoPi);g.strokeStyle='rgba(248,246,207,.64)';g.lineWidth=1.2;g.stroke();}
    const specular=g.createRadialGradient(x-radius*.32,y-radius*.45,.5,x,y,radius*2.2);
    specular.addColorStop(0,point.anchor?'#dce5ff':'#fff6e5');
    specular.addColorStop(.3,point.anchor?'#718cff':i%5===0?'#f9a074':'#d4dcee');
    specular.addColorStop(1,point.anchor?'rgba(44,70,139,.1)':'rgba(43,56,100,.07)');
    g.fillStyle=specular;g.shadowColor=point.anchor?'#587bff':'#ed8569';g.shadowBlur=active?28:12;
    g.beginPath();g.arc(x,y,radius*1.75,0,twoPi);g.fill();g.shadowBlur=0;
  }
  g.fillStyle='#d3dbe9';g.font='10px ui-monospace,Consolas,monospace';
  g.fillText('ELASTIC FIELD / LIVE DISPLACEMENT',25,54);
  g.fillStyle='#e0e8b2';g.fillText(`K ${state.tension}  /  ${state.lattice.springs.length} SPRINGS  /  ${journey.actions} INPUTS`,25,70);
  g.fillStyle='rgba(213,226,255,.65)';g.font='10px ui-monospace,Consolas,monospace';
  g.fillText('DRAG THE MATERIAL OR SEND A PULSE',25,h-50);
}
function updateGate(){
  const input={evidence:Number($('evidence').value),repeatability:Number($('repeatability').value),rights:$('rights').checked};
  state.gate=evaluateGate(input);
  $('evidence-out').textContent=String(input.evidence);
  $('repeatability-out').textContent=String(input.repeatability);
  const first=state.gate.checks.find(v=>!v.pass);
  const status=$('gate-status');status.dataset.verdict=state.gate.status;
  status.textContent=first?`HOLD / FIRST FAILED: ${first.title.toUpperCase()}`:'CANDIDATE / ALL ILLUSTRATIVE CHECKS PASS';
  const target=$('trace');target.replaceChildren();
  for(const c of state.gate.checks){
    const li=document.createElement('li');li.dataset.pass=String(c.pass);
    const title=document.createElement('span');title.textContent=c.title;
    const badge=document.createElement('span');badge.className='trace-state';badge.textContent=c.pass?'PASS':'HOLD';
    li.append(title,badge);target.append(li);
  }
  if(state.mode==='decision')draw();
}

function drawDecision(w,h){
  const g=context;background(w,h,'decision');
  const v=state.gate;
  const narrow=w<510;
  const nodes=v.checks.concat([{id:'verdict',title:'Review gate',pass:v.status==='CANDIDATE'}]);
  const positions=nodes.map((_,i)=>narrow?{x:w*.5,y:h*(.19+i*.21)}:{x:w*(.12+i*.245),y:h*(.5+(i%2?-.04:.04))});
  g.save();g.globalAlpha=.3;g.strokeStyle='#5477b0';g.lineWidth=1;
  for(let i=0;i<3;i++){
    const a=positions[i],b=positions[i+1];
    g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
  }
  g.restore();
  nodes.forEach((node,i)=>{
    const p=positions[i],bad=!node.pass,final=i===3;
    const radius=final?42:narrow?29:35;
    const light=g.createRadialGradient(p.x,p.y,1,p.x,p.y,radius*2.7);
    light.addColorStop(0,bad?'rgba(244,88,63,.25)':'rgba(107,234,196,.22)');light.addColorStop(1,'transparent');
    g.fillStyle=light;g.beginPath();g.arc(p.x,p.y,radius*2.7,0,twoPi);g.fill();
    g.beginPath();g.arc(p.x,p.y,radius,0,twoPi);g.strokeStyle=bad?'#ff8468':'#8deaca';g.lineWidth=final?2.2:1.5;g.stroke();
    g.fillStyle=bad?'#ff8468':'#e2fff1';g.font=`${final?24:19}px Arial`;
    g.textAlign='center';g.textBaseline='middle';g.fillText(bad?'×':final?'✓':String(i+1).padStart(2,'0'),p.x,p.y);
    g.font='10px ui-monospace,Consolas,monospace';g.fillStyle='#c7ccd7';
    g.fillText(['EVIDENCE','REPRODUCE','RIGHTS','GATE'][i],p.x,p.y+radius+20);
    g.fillStyle=bad?'#ffac94':'#96dac4';
    g.fillText(i===0?`${node.value}/100`:i===1?`${node.value}/100`:i===2?node.value?'YES':'NO':v.status,p.x,p.y+radius+37);
  });
  g.textAlign='left';g.textBaseline='alphabetic';g.fillStyle='#abbcd5';g.font='10px ui-monospace,Consolas,monospace';
  g.fillText('CAUSAL GATE / LOCAL REPLAY',22,34);
  g.fillStyle='#a1aab8';g.fillText('NO MODEL / NO REAL RELEASE APPROVAL',22,h-39);
}
function polygon(vertices,fill,stroke='#1d2532',width=1){const g=context;if(!vertices.length)return;g.beginPath();g.moveTo(vertices[0].x,vertices[0].y);for(let i=1;i<vertices.length;i++)g.lineTo(vertices[i].x,vertices[i].y);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}}
function cinemaProjectionFor(w,h,position,angle){return cinemaProjection(position,state.lens,angle,{width:w,height:h});}
function drawPortal(w,h,depth,scale,yaw,lighting){
  const g=context;
  const o={x:0,y:0,z:depth};
  const p=(x,y,z=0)=>cinemaProjectionFor(w,h,{x:x*scale,y:y*scale,z:depth+z},yaw);
  const corners=[p(-1.35,1.6),p(1.35,1.6),p(1.35,-1.4),p(-1.35,-1.4)];
  const inner=[p(-.98,1.23),p(.98,1.23),p(.98,-1.1),p(-.98,-1.1)];
  const shade=Math.max(.2,1-depth*.13);
  const metal=`rgba(${Math.round(55+lighting*1.1)},${Math.round(70+shade*12)},${Math.round(98+shade*30)},${Math.min(.8,shade)})`;
  polygon(corners,metal,`rgba(188,206,255,${shade*.6})`,2);
  polygon(inner,'#0a101e','rgba(20,31,55,.8)',.8);
  g.save();g.shadowColor=lighting>50?'#fb6248':'#3c70ff';g.shadowBlur=20*shade;g.strokeStyle=`rgba(${Math.round(170+lighting*.6)},${Math.round(130+lighting*.5)},${Math.round(132+shade*70)},${shade*.7})`;g.lineWidth=2.2*shade;
  g.beginPath();g.moveTo(corners[0].x,corners[0].y);g.lineTo(corners[1].x,corners[1].y);g.stroke();g.restore();
  return o;
}
function drawPrism(w,h,center,size,yaw,front,side,top){
  const x=center.x,y=center.y,z=center.z,d=size.depth,sx=size.width,sy=size.height;
  const p=(a,b,c)=>cinemaProjectionFor(w,h,{x:x+a,y:y+b,z:z+c},yaw);
  const near=[p(-sx/2,sy/2,-d/2),p(sx/2,sy/2,-d/2),p(sx/2,-sy/2,-d/2),p(-sx/2,-sy/2,-d/2)];
  const far=[p(-sx/2,sy/2,d/2),p(sx/2,sy/2,d/2),p(sx/2,-sy/2,d/2),p(-sx/2,-sy/2,d/2)];
  polygon([far[0],far[1],near[1],near[0]],top,null);
  polygon([near[1],far[1],far[2],near[2]],side,null);
  polygon(near,front,'rgba(255,216,192,.18)',1);
}
function drawCinema(w,h,time){
  const g=context;background(w,h,'cinema');
  const angle=[-.16,.15,.38][state.shot]+(state.motion?Math.sin(time*.18)*.022:0);
  const illumination=state.light/180;
  // Atmospheric shaft, spatial horizon and genuine projection from 3D coordinates.
  const beam=g.createRadialGradient(w*(.4+.32*illumination),h*.28,0,w*.49,h*.42,h*.85);
  beam.addColorStop(0,`rgba(${Math.floor(45+illumination*98)},${Math.floor(63+illumination*54)},${Math.floor(142-illumination*35)},.36)`);
  beam.addColorStop(.48,'rgba(20,27,58,.13)');beam.addColorStop(1,'transparent');
  g.fillStyle=beam;g.fillRect(0,0,w,h);
  const horizon=h*.70;
  g.fillStyle='rgba(12,15,24,.75)';g.fillRect(0,horizon,w,h-horizon);
  g.strokeStyle='rgba(126,148,205,.19)';g.lineWidth=.8;
  const vanish={x:w*.5+angle*w*.15,y:h*.37};
  for(let i=-9;i<=9;i++){
    g.beginPath();g.moveTo(vanish.x,vanish.y);g.lineTo(w*.5+i*w*.20,h);g.stroke();
  }
  for(const z of [15,11,8,6,4,2]){
    const p=cinemaProjectionFor(w,h,{x:0,y:-1.6,z},angle);
    g.beginPath();g.moveTo(0,p.y);g.lineTo(w,p.y);g.stroke();
  }
  for(let i=6;i>=0;i--){
    const depth=i*1.3+1.6;
    drawPortal(w,h,depth,.85+depth*.045,angle,illumination*100);
  }
  // Two solid, different materials. Directional lighting changes face values.
  const warm=illumination;
  g.save();g.shadowColor='#fb5330';g.shadowBlur=24;
  drawPrism(w,h,{x:-1.05,y:-.1,z:.6},{width:.55,height:2.45,depth:.54},angle,
    `rgb(${Math.floor(172+warm*65)},${Math.floor(49+warm*49)},${Math.floor(35+warm*22)})`,'#812b26','#ff9873');
  g.restore();
  g.save();g.shadowColor='#496eff';g.shadowBlur=24;
  drawPrism(w,h,{x:.54,y:.05,z:.1},{width:1.05,height:.36,depth:.55},angle,'#3858e7','#172c84','#91a7ff');
  g.restore();
  // Lens bokeh: lit floating dust, calculated each frame instead of a video loop.
  for(let i=0;i<44;i++){
    const theta=sceneSeed(i+7)*Math.PI*2;
    const dist=.2+sceneSeed(i+57)*2.6;
    const z=sceneSeed(i+101)*9-1;
    const pos=cinemaProjectionFor(w,h,{x:Math.cos(theta)*dist,y:Math.sin(theta)*dist*.8,z},angle);
    const size=clamp(pos.scale*.03,1,3);
    g.fillStyle=i%7===0?'rgba(255,148,90,.43)':'rgba(169,190,255,.21)';
    g.beginPath();g.arc(pos.x,pos.y,size,0,twoPi);g.fill();
  }
  const v=g.createRadialGradient(w*.5,h*.4,w*.09,w*.5,h*.5,Math.max(w,h)*.67);
  v.addColorStop(0,'transparent');v.addColorStop(1,'rgba(2,4,11,.87)');
  g.fillStyle=v;g.fillRect(0,0,w,h);
  g.fillStyle='#c4d2ec';g.font='10px ui-monospace,Consolas,monospace';g.fillText('CINEMATIC PREVIS / ORIGINAL GEOMETRY',23,36);
  g.fillStyle='#e1e892';g.fillText(`SHOT 0${state.shot+1}  /  ${state.lens} MM  /  KEY ${state.light}°`,23,53);
  g.fillStyle='#a3acbd';g.fillText('DIRECT THE LENS AND LIGHT. NO STOCK FOOTAGE.',23,h-42);
}
let lastProof=0;
function draw(now=performance.now()){
  if(!context)return;
  const w=state.width,h=state.height;
  if(!w||!h)return;
  context.save();context.setTransform(state.dpr,0,0,state.dpr,0,0);
  if(state.mode==='matter')drawMatter(w,h,now/1000);
  else if(state.mode==='decision')drawDecision(w,h);
  else drawCinema(w,h,now/1000);
  context.restore();
  state.frame++;
  $('frame-counter').textContent=`FRAME / ${String(state.frame).padStart(4,'0')}`;
  $('scene').dataset.ready='true';
  if(now-lastProof>220){
    const id=state.mode;
    $('state-readout').textContent=id==='matter'?`ENERGY ${state.energy.toFixed(2)} / NODES ${state.lattice.points.length}`:id==='decision'?`GATE ${state.gate?.status}`:`LENS ${state.lens}MM / SHOT 0${state.shot+1}`;
    if(id==='matter')$('matter-proof').textContent=`${state.lattice.points.length} nodes / ${state.lattice.springs.length} springs / energy ${state.energy.toFixed(2)}`;
    lastProof=now;
  }
}
function frame(now){state.raf=0;if(!state.motion||!state.visible||document.hidden)return;
  const dt=state.last?clamp((now-state.last)/1000,0,.025):.016;state.last=now;
  if(state.mode==='matter')state.energy=stepLattice(state.lattice,dt,state.tension,state.drag).energy;
  draw(now);schedule();}
function schedule(){if(!state.raf&&state.motion&&state.visible&&!document.hidden)state.raf=requestAnimationFrame(frame);}
function stop(){if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;state.last=0;}
function resize(){if(!context)return;const r=canvas.getBoundingClientRect();state.width=Math.max(1,r.width);state.height=Math.max(1,r.height);state.dpr=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(state.width*state.dpr);canvas.height=Math.round(state.height*state.dpr);draw();}
function setMode(id,focus=false){if(!panels[id])return;state.mode=id;
  tabs.forEach(tab=>{const active=tab.dataset.mode===id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  Object.entries(panels).forEach(([name,el])=>{el.hidden=name!==id;});
  $('stage-label').textContent=names[id];
  canvas.setAttribute('aria-label',id==='matter'?'Interactive spring network. Drag nodes, or use Pulse and Tension beside the canvas.':id==='decision'?'A diagram of the evidence gate and the first failed step. Adjustable inputs and full text trace are beside the canvas.':'Procedurally lit perspective scene. Change lens and key-light controls beside the canvas.');
  if(focus)document.querySelector(`[data-mode=${id}]`).focus();
  $('render-status').textContent=id==='matter'?'LIVE / SPRING-MASS CONSTRAINTS':id==='decision'?'LIVE / DETERMINISTIC RULE TRACE':'LIVE / 3D GEOMETRY PROJECTION';
  text('scene-instruction',id==='matter'?'01 / PULL, THEN RELEASE':id==='decision'?'02 / THE FIRST FAILURE IS THE SIGNAL':'03 / DIRECT THE LIGHT');
  if(state.audioOn)changeChord(id);
  draw();schedule();}
function pointerAt(e){const rect=canvas.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY-rect.top};}
function pointToWorld(pos){return {x:(pos.x-state.width*.51)/Math.min(state.width*.155,150),y:(pos.y-state.height*.51)/Math.min(state.height*.29,140)};}
canvas.addEventListener('pointerdown',e=>{
  if(state.mode!=='matter'||e.button!==0)return;
  const at=pointerAt(e);
  let index=-1,distance=Infinity;
  state.lattice.points.forEach((p,i)=>{if(p.anchor)return;const c=materialPoint(p,state.width,state.height),d=Math.hypot(c.x-at.x,c.y-at.y);if(d<distance){distance=d;index=i;}});
  if(distance<=35){countAction();const p=pointToWorld(at);state.drag={index,...p};state.hover=index;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';draw();}
});
canvas.addEventListener('pointermove',e=>{
  if(state.mode!=='matter')return;
  const at=pointerAt(e);
  if(state.drag){const p=pointToWorld(at);state.drag.x=p.x;state.drag.y=p.y;
    if(!state.motion)stepLattice(state.lattice,1/60,state.tension,state.drag);draw();}
  else {let closest=-1,dmin=35;state.lattice.points.forEach((p,i)=>{if(p.anchor)return;const c=materialPoint(p,state.width,state.height),d=Math.hypot(c.x-at.x,c.y-at.y);if(d<dmin){dmin=d;closest=i;}});state.hover=closest;if(!state.motion)draw();}
});
function releasePointer(){state.drag=null;state.hover=-1;canvas.style.cursor='default';draw();}
canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);
canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();
  if(state.mode==='matter'){countAction();applyImpulse(state.lattice,.7);if(!state.motion){state.energy=stepLattice(state.lattice,1/60,state.tension).energy;}draw();}
  if(state.mode==='cinema'){state.shot=(state.shot+(e.key==='ArrowLeft'?-1:1)+3)%3;updateCamera();draw();}
});
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>setMode(tab.dataset.mode));tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setMode(tabs[next].dataset.mode,true);});});
$('tension').addEventListener('input',e=>{state.tension=Number(e.target.value);$('tension-out').textContent=String(state.tension);draw();});
$('impulse').addEventListener('click',()=>{countAction();applyImpulse(state.lattice,2.1);if(!state.motion){state.energy=stepLattice(state.lattice,1/60,state.tension).energy;}draw();if(state.audioOn)ping(260,.08);});
$('reset-field').addEventListener('click',()=>{state.lattice=buildLattice();state.energy=0;state.drag=null;state.hover=-1;journey.actions=0;journey.signal=journey.review=journey.direction=null;receipt();draw();});
['evidence','repeatability','rights'].forEach(id=>$(id).addEventListener('input',()=>{
  if(journey.review){journey.review=null;journey.direction=null;receipt();}
  updateGate();
}));
$('export-trace').addEventListener('click',()=>{
  const doc={kind:'Pryntor illustrative gate trace',version:1,inputs:{evidence:Number($('evidence').value),repeatability:Number($('repeatability').value),rights:$('rights').checked},result:state.gate,signal:journey.signal,note:'Illustrative, local-only. Not release approval or an AI model.'};
  download(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),'pryntor-local-trace.json');
});
function updateCamera(){$('lens-out').textContent=state.lens+' MM';$('light-out').textContent=state.light+'°';$('cinema-proof').textContent=`SHOT 0${state.shot+1} / ${state.lens} mm / ${state.light}° key`;}
$('lens').addEventListener('input',e=>{state.lens=Number(e.target.value);journey.direction=null;receipt();updateCamera();draw();});
$('light').addEventListener('input',e=>{state.light=Number(e.target.value);journey.direction=null;receipt();updateCamera();draw();});
$('cut-angle').addEventListener('click',()=>{state.shot=(state.shot+1)%3;journey.direction=null;receipt();updateCamera();draw();if(state.audioOn)ping(330,.1);});
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),600);}
$('save-frame').addEventListener('click',()=>{if(!context)return;canvas.toBlob(blob=>{if(blob)download(blob,'pryntor-local-frame.png');},'image/png');});
$('pause-motion').addEventListener('click',()=>{state.motion=!state.motion;$('pause-motion').setAttribute('aria-pressed',String(!state.motion));$('pause-motion').textContent=state.motion?'PAUSE MOTION':'RESUME MOTION';if(!state.motion)stop();else schedule();draw();});
motionMedia.addEventListener('change',e=>{state.motion=!e.matches;$('pause-motion').setAttribute('aria-pressed',String(!state.motion));$('pause-motion').textContent=state.motion?'PAUSE MOTION':'RESUME MOTION';if(!state.motion)stop();else schedule();draw();});


// The three disciplines are linked by a real, local, inspectable state transfer.
$('carry-signal').addEventListener('click',()=>{
  if(journey.actions<1){text('carry-readout','SEND A PULSE OR DRAG THE FIELD FIRST. NO RESULT FABRICATED.');return;}
  // Sampling current energy is a physics readout, never a fabricated confidence score.
  state.energy=stepLattice(state.lattice,1/120,state.tension).energy;
  journey.signal=captureSignal({energy:state.energy,tension:state.tension,
    actions:journey.actions,nodes:state.lattice.points.length,springs:state.lattice.springs.length});
  journey.review=journey.direction=null;
  text('carry-readout',`CAPTURED ${journey.signal.actions} ACTION(S) / ${journey.signal.energy.toFixed(3)} ENERGY UNITS.`);
  text('signal-ticket',`LOCAL RECEIPT / ${journey.signal.nodes} NODES / ${journey.signal.energy.toFixed(3)} ENERGY UNITS / NOT SCIENTIFIC PROOF`);
  // The interaction's energy is intentionally not converted to a bogus validation score.
  receipt();setMode('decision');
  $('tab-decision').focus();
});
$('advance-frame').addEventListener('click',()=>{
  if(!journey.signal){text('advance-readout','NO PREVIOUS SIGNAL. COMPLETE PART 01 BEFORE LINKING THIS REVIEW.');return;}
  updateGate();
  journey.review=structuredClone(state.gate);
  journey.direction=null;
  const cue=sceneCue(journey.review);
  state.light=cue.light;state.shot=cue.shot;updateCamera();showSceneStatus();
  text('advance-readout',`REVIEW RECORDED AS ${journey.review.status}. THIS IS NOT A RELEASE DECISION.`);
  receipt();setMode('cinema');$('tab-cinema').focus();
});
$('finish-journey').addEventListener('click',()=>{
  if(!journey.review){text('cinema-ticket','TO COMPLETE THE TRACE, FIRST CAPTURE AND REVIEW PARTS 01 AND 02.');return;}
  const cue=sceneCue(journey.review);
  journey.direction={shot:state.shot,lens:state.lens,light:state.light,cue:cue.mood};
  receipt();text('journey-message','ALL THREE STAGES RECORDED. YOUR LOCAL PROOF SHEET IS READY.');
  $('journey-result').scrollIntoView({behavior:motionMedia.matches?'auto':'smooth',block:'center'});
});
$('export-journey').addEventListener('click',()=>{
  const doc=composeJourney({signal:journey.signal,gate:journey.review,frame:journey.direction});
  localSequence++;
  download(new Blob([JSON.stringify({...doc,localSequence},null,2)],{type:'application/json'}),'pryntor-r6-local-proof.json');
});
$('reset-journey').addEventListener('click',()=>{
  journey.actions=0;journey.signal=journey.review=journey.direction=null;
  state.lattice=buildLattice();state.tension=70;state.energy=0;state.drag=null;
  state.lens=50;state.light=65;state.shot=0;
  $('tension').value='70';text('tension-out','70');
  $('evidence').value='82';$('repeatability').value='86';$('rights').checked=false;
  text('carry-readout','No signal captured yet. Send a pulse to begin.');
  text('signal-ticket','AWAITING THE SIGNAL FROM PART 01');
  text('cinema-ticket','NO REVIEW CARRIED FORWARD YET');
  text('advance-readout','Finish an illustrative review to continue.');
  updateGate();updateCamera();receipt();setMode('matter');
  $('tab-matter').focus();
});

// An original, opt-in Web Audio score. There is no source media file, remote service or autoplay.
const chords={matter:[110,164.81,220],decision:[98,146.83,196],cinema:[82.41,123.47,164.81]};
function changeChord(mode){if(!state.audio)return;const {ctx,oscillators}=state.audio;oscillators.forEach((o,i)=>o.frequency.setTargetAtTime(chords[mode][i],ctx.currentTime,.75));}
function ping(freq=220,duration=.1){if(!state.audioOn||!state.audio)return;const {ctx,destination}=state.audio;const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(.018,ctx.currentTime+.015);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration+.15);o.connect(g);g.connect(destination);o.start();o.stop(ctx.currentTime+duration+.17);}
async function stopAudio(){if(state.audio){try{await state.audio.ctx.close();}catch{}state.audio=null;}state.audioOn=false;const b=$('sound-toggle');b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Enable original local audio score');b.textContent='SOUND OFF ♫';}
$('sound-toggle').addEventListener('click',async()=>{
  if(state.audioOn){await stopAudio();return;}
  const AudioCtor=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtor){$('render-status').textContent='LOCAL AUDIO UNAVAILABLE / VISUALS CONTINUE';return;}
  try{
    const ctx=new AudioCtor();await ctx.resume();
    const destination=ctx.createGain();destination.gain.value=.68;destination.connect(ctx.destination);
    const oscillators=[];
    for(let i=0;i<3;i++){
      const oscillator=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
      oscillator.type=i===1?'triangle':'sine';oscillator.frequency.value=chords[state.mode][i];
      filter.type='lowpass';filter.frequency.value=600+i*170;
      gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(i===0?.018:.009,ctx.currentTime+.8);
      oscillator.connect(filter);filter.connect(gain);gain.connect(destination);oscillator.start();oscillators.push(oscillator);
    }
    state.audio={ctx,destination,oscillators};state.audioOn=true;
    const b=$('sound-toggle');b.setAttribute('aria-pressed','true');b.setAttribute('aria-label','Disable original local audio score');b.textContent='SOUND ON ♫';
  }catch{await stopAudio();$('render-status').textContent='AUDIO PERMISSION UNAVAILABLE / VISUALS CONTINUE';}
});
document.addEventListener('visibilitychange',()=>{state.visible=!document.hidden;if(!state.visible){stop();void stopAudio();}else{draw();schedule();}});
window.addEventListener('pagehide',()=>{stop();void stopAudio();});

receipt();
if(!context){$('render-status').textContent='CANVAS UNAVAILABLE / CONTROLS AND TEXT REMAIN';}
else {
  updateGate();updateCamera();
  new ResizeObserver(resize).observe(canvas);
  const observer=new IntersectionObserver(entries=>{state.visible=entries[0].isIntersecting;
    if(!state.visible)stop();else{draw();schedule();}
  },{threshold:.005});observer.observe(canvas);
  if(state.motion)applyImpulse(state.lattice,.3);
  resize();setMode('matter');schedule();
}