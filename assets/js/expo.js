import {clamp, samples, evaluateThreshold, armPose, wavePath, blockPosition} from './expo-model.mjs';
import {mountCanvas} from './expo-renderer.mjs';
const $=id=>document.getElementById(id);
const body=document.body, stage=$('stage'), rooms=[...stage.querySelectorAll('.room')];
const ids=rooms.map(room=>room.id), nav=[...document.querySelectorAll('[data-scene]')];
const reduce=matchMedia('(prefers-reduced-motion: reduce)'), visited=new Set();
let current='software', mapping=false, renderer=null, motionOn=!reduce.matches, waveRunning=false, phase=0, frame=0, last=0;
const copy={
  software:['01 / SOFTWARE & SYSTEMS','A little|order.|~A lot of|~possibility.','One small piece. Many possible systems. Pull this one apart, then put it back together.','Tap the field. Break the pattern.','01 — ASSEMBLY FIELD','index.html#work'],
  learning:['02 / INTERACTIVE LEARNING','Get a feel|for the|~invisible.','Some ideas make more sense when you can change them. Find the relationship between frequency, amplitude and motion.','Shape the wave. See what changes.','02 — WAVE LABORATORY','index.html#ventures'],
  evaluation:['03 / AI EVALUATION','Looks|certain.|~Is it right?','A confident answer can still be wrong. Raise the bar, inspect the evidence and see what slips through.','Set a threshold. Then reveal the answers.','03 — CONFIDENCE ISN’T PROOF','method.html#test'],
  creative:['04 / CREATIVE TECHNOLOGY','A familiar|face.|~Your own|~spin.','Original characters. New contexts. Make a small piece of Pryntor your own with a headline and a different point of view.','Write something. Make it yours.','04 — POSTER STUDIO','index.html#ventures'],
  robotics:['05 / ROBOTICS SIMULATION','A little|reach.|~A new|~possibility.','Two joints create a surprising range of movement. Explore how small changes add up to a different place.','Move either joint. Follow the endpoint.','05 — REACH STUDY','method.html'],
  all:['00 / THE WHOLE PLAYGROUND','Follow|your|~curiosity.','Five ways to play with an idea. Step into any experiment, change something and see where it takes you.','Drag to explore. Choose a place to begin.','OVERVIEW — FIVE CONNECTED IDEAS','method.html'],
};
function heading(text){
  $('expo-title').replaceChildren();
  text.split('|').forEach((line,i)=>{if(i)$('expo-title').append(document.createElement('br'));const node=document.createElement(line.startsWith('~')?'em':'span');node.textContent=line.replace(/^~/,'');$('expo-title').append(node);});
}
function reportCanvas(active){body.dataset.renderer=active?'html-in-canvas':'html';$('renderer-status').textContent=active?'HTML-in-Canvas is active. These are live HTML controls drawn into a canvas.':'HTML view is active. Every experiment and control works here.';}
function setWave(running){waveRunning=running&&motionOn&&!mapping&&current==='learning';$('wave-play').setAttribute('aria-pressed',String(waveRunning));$('wave-play').textContent=waveRunning?'Pause wave Ⅱ':'Play wave ↗';cancelAnimationFrame(frame);last=0;if(waveRunning)frame=requestAnimationFrame(animateWave);}
function select(id,updateHash=true,scroll=false){
  if(id!=='all'&&!ids.includes(id))id='software';
  const fromMap=document.activeElement?.classList.contains('map-node');
  renderer?.restore();renderer=null;setWave(false);
  mapping=id==='all';if(!mapping){current=id;visited.add(id);}
  const data=copy[id];$('chapter').textContent=data[0];heading(data[1]);$('story-copy').textContent=data[2];$('instruction').textContent='↳ '+data[3];$('stage-label').textContent=data[4];$('context-link').href=data[5];
  rooms.forEach(room=>{room.hidden=mapping||room.id!==id;room.inert=room.hidden;});
  stage.hidden=mapping;$('map-view').hidden=!mapping;body.classList.toggle('map-mode',mapping);
  nav.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scene===id)));
  $('overview').setAttribute('aria-pressed',String(mapping));
  $('visited').textContent=String(visited.size).padStart(2,'0')+' / 05 EXPLORED';
  $('next').firstChild.textContent=mapping?'Start exploring ':'Next experiment ';
  if(updateHash)try{history.replaceState(null,'','#'+id);}catch{/* A sandbox may disallow history. */}
  reportCanvas(false);
  if(!mapping){renderer=mountCanvas(stage,$(id),reportCanvas);if(motionOn&&!body.classList.contains('keyboard-input'))stage.animate([{opacity:.35,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});}
  else updateMap();
  if(fromMap&&!mapping){$('expo-title').setAttribute('tabindex','-1');$('expo-title').focus({preventScroll:true});}
  if(scroll&&innerWidth<=760){$('exhibition').scrollIntoView({behavior:'instant',block:'start'});}
}
function repaint(){renderer?.request();}
function setMotion(value){motionOn=value;body.classList.toggle('motion-off',!value);$('motion').setAttribute('aria-pressed',String(value));$('motion').textContent=value?'Motion on':'Motion off';if(!value)setWave(false);$('wave-play').disabled=!value;repaint();}
function fromHash(){select(location.hash.slice(1)||'software',false);}
// Assembly: reversible, deterministic displacement. No idle animation loop.
const blocks=Array.from({length:36},(_,i)=>{
  const block=document.createElement('i');block.className='block'+(i%11===0?' orange':i===20?' yellow':'');block.setAttribute('aria-hidden','true');
  for(const face of ['top','left','right']){const el=document.createElement('b');el.className=face;block.append(el);}
  $('block-field').append(block);return block;
});
// Paint the nearest row last so touching blocks occlude each other correctly.
[...blocks.keys()].sort((a,b)=>(Math.floor(a/6)+a%6)-(Math.floor(b/6)+b%6)).forEach(i=>$('block-field').append(blocks[i]));
function assemble(value,direct=false){
  $('spread').value=value;$('spread').setAttribute('aria-valuetext',value+' percent disorder');$('assembly-art').setAttribute('aria-pressed',String(value>0));$('spread-value').textContent=value+'%';body.classList.toggle('direct-input',direct);
  blocks.forEach((block,i)=>{const p=blockPosition(i,value);block.style.transform=`translate(${p.x}px,${p.y}px) rotate(${p.rotation}deg)`;});
  $('block-field').setAttribute('aria-label',`Thirty-six blocks with disorder set to ${value} percent`);
  $('assembly-result').textContent=value===0?'36 pieces. One system. Change the distance between them.':value===100?'Same pieces. A different arrangement. Bring them back together.':`${value}% disorder. The pieces stay the same; their relationships change.`;
  repaint();
}
$('assembly-art').addEventListener('click',()=>assemble(Number($('spread').value)>0?0:100));
$('assembly-art').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();assemble(Number($('spread').value)>0?0:100);}});
function fitBlocks(){const width=$('assembly-art').clientWidth;if(width>0)$('block-field').style.setProperty('--field-scale',Math.min(1.2,(width-50)/540));}
if('ResizeObserver' in window)new ResizeObserver(fitBlocks).observe($('assembly-art'));else addEventListener('resize',fitBlocks);
$('spread').addEventListener('input',event=>assemble(Number(event.target.value),true));
$('scatter').addEventListener('click',()=>assemble(100));$('assemble').addEventListener('click',()=>assemble(0));
// Learning: a sine function with a user-controlled phase animation.
function drawWave(){const frequency=Number($('frequency').value)/10,amplitude=Number($('amplitude').value);$('frequency-value').textContent=frequency.toFixed(1)+' cycles';$('frequency').setAttribute('aria-valuetext',frequency.toFixed(1)+' cycles');$('amplitude-value').textContent=String(amplitude);$('wave-line').setAttribute('d',wavePath(frequency,amplitude,phase));$('wave-shadow').setAttribute('d',wavePath(frequency,amplitude,phase+.7));$('wave-desc').textContent=`Sine wave: ${frequency.toFixed(1)} cycles, amplitude ${amplitude}. The orange trace is offset in phase.`;repaint();}
function animateWave(time){if(!waveRunning||document.hidden)return;if(!last)last=time;const dt=Math.min((time-last)/1000,.06);if(dt>=1/30){phase+=dt*1.8;last=time;drawWave();}frame=requestAnimationFrame(animateWave);}
for(const id of ['frequency','amplitude'])$(id).addEventListener('input',drawWave);
$('wave-play').addEventListener('click',()=>setWave(!waveRunning));
// Evaluation: visibly fictional fixtures, never a live or validated AI service.
let revealed=false;
const sampleNodes=new Map(samples.map(sample=>{const el=document.createElement('div');el.className='sample';const strong=document.createElement('strong');strong.textContent=sample.confidence+'%';const label=document.createElement('span');label.textContent='CASE '+sample.id;el.append(strong,label);return [sample.id,el];}));
function drawEvidence(){const threshold=Number($('threshold').value),result=evaluateThreshold(threshold);$('threshold-value').textContent=threshold+'%';$('threshold').setAttribute('aria-valuetext',threshold+' percent');for(const [lane,list] of [['passed',result.passed],['held',result.held]]){for(const sample of list){const el=sampleNodes.get(sample.id);el.classList.toggle('incorrect',revealed&&!sample.correct);el.lastChild.textContent='CASE '+sample.id+(revealed?(sample.correct?' / ✓ RIGHT':' / × WRONG'):'');$(lane).append(el);}}
  $('evidence-result').textContent=revealed?`${result.passed.length} of 8 pass. ${result.errors} ${result.errors===1?'is':'are'} wrong. Confidence is a signal; checking the answer is a separate step.`:`${result.passed.length} of 8 pass. Are they right? Reveal the answers to find out.`;
  $('reveal').textContent=revealed?'Hide the answers ↙':'Reveal the answers ↗';$('reveal').setAttribute('aria-pressed',String(revealed));repaint();
}
$('threshold').addEventListener('input',drawEvidence);$('reveal').addEventListener('click',()=>{revealed=!revealed;drawEvidence();});
// Creative: original approved character asset; arbitrary text is written as text.
$('poster-text').addEventListener('input',()=>{const value=$('poster-text').value.trim();$('poster-word').textContent=value||'MAKE IT MOVE.';repaint();});
$('poster-scale').addEventListener('input',()=>{const value=Number($('poster-scale').value);$('poster-scale-value').textContent=value+'%';$('poster-scale').setAttribute('aria-valuetext',value+' percent');$('poster-art').style.setProperty('--mascot-scale',value/100);repaint();});
$('poster-colour').addEventListener('click',()=>{const white=$('poster-art').classList.toggle('white');$('poster-colour').textContent=white?'Cobalt backdrop ↗':'White backdrop ↗';repaint();});
// Robotics: planar forward kinematics, dimensions in illustrative model units.
function drawArm(){const a=Number($('shoulder').value),b=Number($('elbow').value),pose=armPose(a,b);const x1=290+pose.joint.x,y1=330-pose.joint.y,x2=290+pose.tip.x,y2=330-pose.tip.y;$('arm-links').setAttribute('d',`M290 330L${x1} ${y1}L${x2} ${y2}`);$('arm-joint').setAttribute('cx',x1);$('arm-joint').setAttribute('cy',y1);$('arm-tip').setAttribute('cx',x2);$('arm-tip').setAttribute('cy',y2);$('shoulder-value').textContent=a+'°';$('elbow-value').textContent=b+'°';$('shoulder').setAttribute('aria-valuetext',a+' degrees');$('elbow').setAttribute('aria-valuetext',b+' degrees');$('arm-position').textContent=`X ${Math.round(pose.tip.x)} / Y ${Math.round(pose.tip.y)}`;$('arm-desc').textContent=`Shoulder ${a} degrees, elbow ${b} degrees. Endpoint X ${Math.round(pose.tip.x)}, Y ${Math.round(pose.tip.y)} model units.`;repaint();}
for(const id of ['shoulder','elbow'])$(id).addEventListener('input',drawArm);
$('arm-reset').addEventListener('click',()=>{$('shoulder').value=60;$('elbow').value=-60;drawArm();});
// Spatial overview. Selection buttons always provide a keyboard alternative to drag.
let zoom=1,panX=0,panY=0,drag=null;
const viewport=$('map-viewport');
function updateMap(){if(!mapping)return;const base=Math.min(viewport.clientWidth/1040,viewport.clientHeight/690);$('map-plane').style.transform=`translate(calc(-50% + ${panX}px),calc(-50% + ${panY}px)) scale(${base*zoom})`;$('zoom-level').textContent=Math.round(zoom*100)+'%';$('zoom-out').disabled=zoom<=1;$('zoom-in').disabled=zoom>=2.5;}
function fitMap(){zoom=1;panX=panY=0;updateMap();}
$('zoom-in').addEventListener('click',()=>{zoom=clamp(zoom+.25,1,2.5);updateMap();});$('zoom-out').addEventListener('click',()=>{zoom=clamp(zoom-.25,1,2.5);updateMap();});$('map-reset').addEventListener('click',fitMap);
viewport.addEventListener('pointerdown',event=>{if(event.target.closest('button')||event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,px:panX,py:panY};viewport.setPointerCapture(event.pointerId);viewport.classList.add('dragging');});
viewport.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;panX=clamp(drag.px+event.clientX-drag.x,-viewport.clientWidth*.7,viewport.clientWidth*.7);panY=clamp(drag.py+event.clientY-drag.y,-viewport.clientHeight*.7,viewport.clientHeight*.7);updateMap();});
function endDrag(){drag=null;viewport.classList.remove('dragging');}
viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);viewport.addEventListener('lostpointercapture',endDrag);
nav.forEach(button=>button.addEventListener('click',()=>select(button.dataset.scene,true,true)));
$('overview').addEventListener('click',()=>{select('all',true,true);fitMap();});
$('next').addEventListener('click',()=>select(mapping?'software':ids[(ids.indexOf(current)+1)%ids.length],true,true));
$('motion').addEventListener('click',()=>setMotion(!motionOn));reduce.addEventListener('change',event=>setMotion(!event.matches));
document.addEventListener('keydown',event=>{body.classList.add('keyboard-input');if(event.key==='Escape'&&!['INPUT','TEXTAREA'].includes(event.target.tagName)){select('all');$('overview').focus();}});
document.addEventListener('pointerdown',()=>body.classList.remove('keyboard-input'),{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setWave(false);else repaint();});
addEventListener('hashchange',fromHash);addEventListener('resize',updateMap);
addEventListener('beforeprint',()=>{renderer?.restore();renderer=null;rooms.forEach(room=>room.inert=false);});
addEventListener('afterprint',()=>select(mapping?'all':current,false));
body.classList.add('enhanced');$('assembly-art').setAttribute('role','button');$('assembly-art').setAttribute('tabindex','0');$('assembly-art').setAttribute('aria-label','Scatter or assemble the blocks');assemble(0);drawWave();drawEvidence();drawArm();setMotion(motionOn);fromHash();
document.fonts.ready.then(repaint);document.querySelectorAll('.room img').forEach(img=>img.addEventListener('load',repaint));
