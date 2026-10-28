import {clamp, samples, evaluateThreshold, armPose, wavePath, blockPosition, armTargets, reachesTarget} from './expo-model.mjs';
import {mountCanvas} from './expo-renderer.mjs';
const $=id=>document.getElementById(id);
const body=document.body, stage=$('stage'), rooms=[...stage.querySelectorAll('.room')];
const ids=['creative','learning','evaluation','robotics','software'], nav=[...document.querySelectorAll('[data-scene]')];
const reduce=matchMedia('(prefers-reduced-motion: reduce)'), visited=new Set();
let current='creative', mapping=false, renderer=null, motionOn=!reduce.matches, waveRunning=false, phase=0, frame=0, last=0;
const copy={
  creative:['01 / CREATIVE TECHNOLOGY','Make it|~yours.','Type your name or a message to make a poster with our original character. You’ll see it change as you type.','Replace “HELLO, CURIOUS.” with your own headline.','YOUR POSTER, AS YOU TYPE','index.html#work'],
  learning:['02 / SHAPE A WAVE','What makes|~a wave?','You’ve seen waves in water. Here you can change their shape: add more waves, make them taller, then set them moving.','Move either slider, then press Play wave.','CHANGE THE SHAPE. WATCH IT MOVE.','index.html#work'],
  evaluation:['03 / TEST AN ANSWER','Very sure.|~Still wrong?','Imagine these answers came from an AI. Its score says how sure it is. Pick a minimum score, then check the maths.','Leave the minimum at 70%. Check the accepted answers.','CAN YOU SPOT THE CONFIDENT MISTAKES?','method.html#test'],
  robotics:['04 / MOVE A ROBOT ARM','Can you|~reach the ring?','Two joints control this simulated arm. Move its tip into the orange ring by changing one joint at a time.','Try Rotate the base, then Bend the elbow.','A SMALL CHALLENGE IN MOVEMENT','method.html'],
  software:['05 / PLAY WITH BLOCKS','Pull it apart.|~Put it together.','Thirty-six blocks can form a neat platform or a scattered collection. You control how far apart they move.','Tap the blocks or press Put them together.','THE SAME PIECES. A DIFFERENT ARRANGEMENT.','index.html#work'],
  all:['CHOOSE YOUR NEXT EXPERIMENT','What will|~you try next?','Make something visual, test a surprising answer or take control of a simulated arm. Each experiment gives you a different way to explore.','Choose any experiment. You can also drag and zoom the map.','FIVE THINGS YOU CAN TRY','method.html'],
};
const takeaways={
  creative:['Creativity gets clearer when you can try it.','We develop original characters and visual experiences. This small editor lets you explore how words, colour and scale change a design.'],
  learning:['Learning starts to click when you can change things.','We develop interactive learning tools. Here, moving a slider makes the relationship between wave height and frequency visible.'],
  evaluation:['Checking an answer matters more than how certain it sounds.','Pryntor researches AI evaluation: ways to examine where systems succeed and fail. The scores here are invented; the maths lets you check the answers yourself.'],
  robotics:['Try the movement before building the machine.','We explore robotics and control in simulation. This simplified arm shows how two joint angles combine to determine where its tip can reach.'],
  software:['Good interfaces make cause and effect easy to see.','We build software and web experiences. This small interaction shows one useful principle: make a change, see the result, and give people a clear way back.'],
  all:['A small introduction to a bigger body of work.','These are playful demonstrations of ideas we explore. Our wider work includes software prototypes, learning tools, creative development, AI evaluation and robotics simulation.'],
};
const names={creative:'Make a poster',learning:'Shape a wave',evaluation:'Test an answer',robotics:'Move a robot arm',software:'Play with blocks'};
function heading(text){
  $('expo-title').replaceChildren();
  text.split('|').forEach((line,i)=>{if(i)$('expo-title').append(document.createElement('br'));const node=document.createElement(line.startsWith('~')?'em':'span');node.textContent=line.replace(/^~/,'');$('expo-title').append(node);});
}
function reportCanvas(active){body.dataset.renderer=active?'html-in-canvas':'html';$('renderer-status').textContent=active?'HTML-in-Canvas is active. These are live HTML controls drawn into a canvas.':'HTML view is active. Every experiment and control works here.';}
function setWave(running){waveRunning=running&&motionOn&&!mapping&&current==='learning';$('wave-play').setAttribute('aria-pressed',String(waveRunning));$('wave-play').textContent=waveRunning?'Pause wave Ⅱ':'Play wave ↗';cancelAnimationFrame(frame);last=0;if(waveRunning)frame=requestAnimationFrame(animateWave);}
function select(id,updateHash=true,scroll=false){
  if(id!=='all'&&!ids.includes(id))id='creative';
  const fromIndex=document.activeElement?.classList.contains('gallery-card');
  renderer?.restore();renderer=null;setWave(false);
  body.dataset.scene=id;mapping=id==='all';if(!mapping){current=id;visited.add(id);}
  const data=copy[id];$('chapter').textContent=data[0];heading(data[1]);$('story-copy').textContent=data[2];$('instruction').textContent=data[3];$('stage-label').textContent=data[4];$('context-link').href=data[5];$('takeaway-title').textContent=takeaways[id][0];$('takeaway-copy').textContent=takeaways[id][1];$('context-link').firstChild.textContent=['evaluation','robotics','all'].includes(id)?'How we explore and test ideas ':'See what Pryntor is developing ';
  rooms.forEach(room=>{room.hidden=mapping||room.id!==id;room.inert=room.hidden;});
  stage.hidden=mapping;document.querySelector('.workspace').hidden=mapping;document.querySelector('.exhibition-index').hidden=!mapping;document.querySelector('.takeaway').hidden=mapping;
  nav.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scene===id)));
  $('overview').setAttribute('aria-pressed',String(mapping));
  $('visited').textContent=visited.size+' OF 5 OPENED';
  $('next').firstChild.textContent=mapping?'Start with a poster ':'Next: '+names[ids[(ids.indexOf(current)+1)%ids.length]]+' ';
  if(updateHash)try{history.replaceState(null,'','#'+id);}catch{/* A sandbox may disallow history. */}
  reportCanvas(false);
  if(!mapping){if(id==='creative')fitPoster();renderer=mountCanvas(stage,$(id),reportCanvas);if(motionOn&&!body.classList.contains('keyboard-input'))stage.animate([{opacity:.35,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});}
  if(fromIndex&&!mapping){$('expo-title').setAttribute('tabindex','-1');$('expo-title').focus({preventScroll:true});}
  if(scroll){(mapping?$('index-title'):document.querySelector('.chapter-nav')).scrollIntoView({behavior:'instant',block:'start'});if(mapping)$('index-title').focus({preventScroll:true});}
}
function repaint(){renderer?.request();}
function setMotion(value){motionOn=value;body.classList.toggle('motion-off',!value);$('motion').setAttribute('aria-pressed',String(value));$('motion').textContent=value?'Motion on':'Motion off';if(!value)setWave(false);$('wave-play').disabled=!value;repaint();}
function fromHash(){const id=location.hash.slice(1);if(id==='exhibition')return;select(id||'all',false);}
// Assembly: reversible, deterministic displacement. No idle animation loop.
const blocks=Array.from({length:36},(_,i)=>{
  const block=document.createElement('i');block.className='block'+(i%11===0?' orange':i===20?' yellow':'');block.setAttribute('aria-hidden','true');
  for(const face of ['top','left','right']){const el=document.createElement('b');el.className=face;block.append(el);}
  $('block-field').append(block);return block;
});
// Paint the nearest row last so touching blocks occlude each other correctly.
[...blocks.keys()].sort((a,b)=>(Math.floor(a/6)+a%6)-(Math.floor(b/6)+b%6)).forEach(i=>$('block-field').append(blocks[i]));
function assemble(value,direct=false){
  $('spread').value=value;$('spread').setAttribute('aria-valuetext',value+' percent spread');$('assembly-art').setAttribute('aria-pressed',String(value>0));$('spread-value').textContent=value+'%';body.classList.toggle('direct-input',direct);
  blocks.forEach((block,i)=>{const p=blockPosition(i,value);block.style.transform=`translate(${p.x}px,${p.y}px) rotate(${p.rotation}deg)`;});
  $('block-field').setAttribute('aria-label',`Thirty-six blocks with disorder set to ${value} percent`);
  $('assembly-result').textContent=value===0?'Back together. Now scatter them again, or move the slider to choose something in between.':value===100?'Scattered. Tap again or press Put them together to rebuild the platform.':`${value}% spread apart. Move the slider left to bring the blocks together.`;
  repaint();
}
$('assembly-art').addEventListener('click',()=>assemble(Number($('spread').value)>0?0:100));
$('assembly-art').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();assemble(Number($('spread').value)>0?0:100);}});
function fitBlocks(){const width=$('assembly-art').clientWidth;if(width>0)$('block-field').style.setProperty('--field-scale',Math.min(1.1,(width-50)/540,($('assembly-art').clientHeight-80)/360));}
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
const sampleNodes=new Map(samples.map(sample=>{
  const el=document.createElement('div');el.className='sample';
  const question=document.createElement('p');question.className='sample-question';question.textContent=sample.question+' =';
  const answer=document.createElement('strong');answer.textContent=sample.answer;
  const score=document.createElement('span');score.className='sample-score';score.textContent=sample.confidence+'% sure';
  const verdict=document.createElement('span');verdict.className='sample-verdict';verdict.textContent='Not checked yet';
  el.append(question,answer,score,verdict);return [sample.id,el];
}));
function drawEvidence(){
  const threshold=Number($('threshold').value),result=evaluateThreshold(threshold);
  $('threshold-value').textContent=threshold+'%';$('threshold').setAttribute('aria-valuetext',threshold+' percent');
  for(const [lane,list] of [['passed',result.passed],['held',result.held]])for(const sample of list){
    const el=sampleNodes.get(sample.id);el.classList.toggle('incorrect',revealed&&!sample.correct);
    el.lastChild.textContent=revealed?(sample.correct?'✓ Correct':'× Should be '+sample.expected):'Not checked yet';$(lane).append(el);
  }
  $('evidence-result').textContent=revealed?(result.passed.length?`${result.passed.length} accepted. ${result.errors} ${result.errors===1?'is':'are'} wrong. A high score did not guarantee a correct answer.`:'No answers accepted. Lower the minimum score to compare confidence with correctness.'):`${result.passed.length} of 8 answers accepted. The percentages are invented confidence scores. Check the answers to see which are actually right.`;
  $('reveal').textContent=revealed?'Hide the checks ↙':'Check the answers ↗';$('reveal').setAttribute('aria-pressed',String(revealed));repaint();
}
$('threshold').addEventListener('input',drawEvidence);$('reveal').addEventListener('click',()=>{revealed=!revealed;drawEvidence();});
// Creative: original approved character asset; arbitrary text is written as text.
$('poster-text').addEventListener('input',()=>{const value=$('poster-text').value.trim();$('poster-word').textContent=value||'HELLO, CURIOUS.';fitPoster();$('poster-result').textContent=value?'That’s your headline. Now try a different background or character size.':'A blank headline restores the starting poster. Try typing your name.';repaint();});
$('poster-scale').addEventListener('input',()=>{const value=Number($('poster-scale').value);$('poster-scale-value').textContent=value+'%';$('poster-scale').setAttribute('aria-valuetext',value+' percent');$('poster-art').style.setProperty('--mascot-scale',value/100);repaint();});
$('poster-colour').addEventListener('click',()=>{const white=$('poster-art').classList.toggle('white');$('poster-colour').textContent=white?'Try a blue background ↗':'Try a white background ↗';repaint();});
// Keep all accepted headlines readable, including 24 unbroken wide letters.
function fitPoster(){
  const art=$('poster-art'),word=$('poster-word');
  if(!art.clientWidth)return;
  word.style.fontSize='';
  const start=parseFloat(getComputedStyle(word).fontSize);
  const available=Math.max(45,art.clientHeight*.53-(word.offsetTop));
  let size=start;
  while(size>20&&(word.scrollHeight>available||word.scrollWidth>word.clientWidth+1)){
    size-=1;word.style.fontSize=size+'px';
  }
}
if('ResizeObserver' in window)new ResizeObserver(()=>{fitPoster();repaint();}).observe($('poster-art'));
$('poster-reset').addEventListener('click',()=>{
  $('poster-text').value='HELLO, CURIOUS.';$('poster-word').textContent='HELLO,\nCURIOUS.';
  $('poster-scale').value=100;$('poster-scale').setAttribute('aria-valuetext','100 percent');$('poster-scale-value').textContent='100%';
  $('poster-art').style.setProperty('--mascot-scale',1);$('poster-art').classList.add('white');$('poster-colour').textContent='Try a blue background ↗';
  fitPoster();$('poster-result').textContent='Poster reset. Your starting words, colour and character size are restored.';repaint();
});
function posterLines(ctx,text,width){
  const lines=[];
  for(const paragraph of text.split('\n')){
    let line='';
    for(const word of paragraph.split(' ')){
      const candidate=line?line+' '+word:word;
      if(ctx.measureText(candidate).width<=width){line=candidate;continue;}
      if(line){lines.push(line);line='';}
      for(const char of word){if(line&&ctx.measureText(line+char).width>width){lines.push(line);line='';}line+=char;}
    }
    lines.push(line);
  }
  return lines;
}
$('poster-download').addEventListener('click',async()=>{
  const button=$('poster-download');button.disabled=true;button.textContent='Preparing image…';
  try{
    await document.fonts.ready;fitPoster();
    const art=$('poster-art'),rect=art.getBoundingClientRect(),canvas=document.createElement('canvas'),scale=2;
    canvas.width=Math.round(rect.width*scale);canvas.height=Math.round(rect.height*scale);
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
    ctx.scale(scale,scale);ctx.fillStyle=getComputedStyle(art).backgroundColor;ctx.fillRect(0,0,rect.width,rect.height);ctx.textBaseline='top';
    for(const el of [art.querySelector('.poster-top'),$('poster-word'),art.querySelector('.poster-bottom')]){
      const style=getComputedStyle(el),box=el.getBoundingClientRect();ctx.fillStyle=style.color;ctx.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;if('letterSpacing' in ctx)ctx.letterSpacing=style.letterSpacing;
      const lines=posterLines(ctx,el.textContent,box.width),lineHeight=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.2;
      lines.forEach((line,i)=>ctx.fillText(line,box.left-rect.left,box.top-rect.top+i*lineHeight));
    }
    const img=art.querySelector('img');if(!img.complete||!img.naturalWidth)throw Error('Character image unavailable');
    const box=img.getBoundingClientRect(),ratio=Math.min(box.width/img.naturalWidth,box.height/img.naturalHeight),w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;
    ctx.drawImage(img,box.left-rect.left+(box.width-w)/2,box.top-rect.top+(box.height-h)/2,w,h);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Image unavailable');
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='pryntor-your-poster.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    $('poster-result').textContent='Your PNG is ready. Check your browser’s downloads to keep or share it.';
  }catch{
    $('poster-result').textContent='The image could not be prepared. Your poster is still here. Try downloading again.';
  }finally{button.disabled=false;button.textContent='Download poster ↓';repaint();}
});
// Robotics: planar forward kinematics, dimensions in illustrative model units.
let targetIndex=0;
function drawArm(){
  const a=Number($('shoulder').value),b=Number($('elbow').value),pose=armPose(a,b),target=armPose(armTargets[targetIndex].shoulder,armTargets[targetIndex].elbow);
  const x1=290+pose.joint.x,y1=330-pose.joint.y,x2=290+pose.tip.x,y2=330-pose.tip.y;
  $('arm-links').setAttribute('d',`M290 330L${x1} ${y1}L${x2} ${y2}`);$('arm-joint').setAttribute('cx',x1);$('arm-joint').setAttribute('cy',y1);$('arm-tip').setAttribute('cx',x2);$('arm-tip').setAttribute('cy',y2);
  const tx=290+target.tip.x,ty=330-target.tip.y,success=reachesTarget(pose,target);
  $('arm-target').setAttribute('cx',tx);$('arm-target').setAttribute('cy',ty);$('arm-target-label').setAttribute('x',tx);$('arm-target-label').setAttribute('y',Math.max(23,ty-38));$('robotics').classList.toggle('target-reached',success);
  $('shoulder-value').textContent=a+'°';$('elbow-value').textContent=b+'°';$('shoulder').setAttribute('aria-valuetext',a+' degrees');$('elbow').setAttribute('aria-valuetext',b+' degrees');
  $('arm-position').textContent=success?'You reached it!':'Reach the orange ring';$('arm-feedback').textContent=success?'TRY A NEW TARGET WHEN YOU’RE READY':'MOVE THE TIP WITH THE TWO SLIDERS';
  $('arm-target-label').textContent=success?'REACHED ✓':'REACH HERE';
  $('arm-desc').textContent=`Base ${a} degrees, elbow ${b} degrees. ${success?'Target reached.':'Target not reached yet.'}`;
  $('arm-result').textContent=success?'You reached it. Try a new target, or reset the arm and find another path.':'Move the two sliders until the tip touches the orange ring. Each joint changes the path. This is a simulation.';
  repaint();
}
for(const id of ['shoulder','elbow'])$(id).addEventListener('input',drawArm);
$('arm-reset').addEventListener('click',()=>{$('shoulder').value=60;$('elbow').value=-60;drawArm();});
$('arm-new-target').addEventListener('click',()=>{targetIndex=(targetIndex+1)%armTargets.length;drawArm();});
// Image-led overview and direct chapter selection.
nav.forEach(button=>button.addEventListener('click',()=>select(button.dataset.scene,true,true)));
$('overview').addEventListener('click',()=>select('all',true,true));
$('next').addEventListener('click',()=>select(mapping?'creative':ids[(ids.indexOf(current)+1)%ids.length],true,true));
$('motion').addEventListener('click',()=>setMotion(!motionOn));reduce.addEventListener('change',event=>setMotion(!event.matches));
document.addEventListener('keydown',event=>{body.classList.add('keyboard-input');if(event.key==='Escape'&&!['INPUT','TEXTAREA'].includes(event.target.tagName)){select('all',true,true);}});
document.addEventListener('pointerdown',()=>body.classList.remove('keyboard-input'),{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setWave(false);else repaint();});
addEventListener('hashchange',fromHash);
addEventListener('beforeprint',()=>{renderer?.restore();renderer=null;rooms.forEach(room=>room.inert=false);});
addEventListener('afterprint',()=>select(mapping?'all':current,false));
body.classList.add('enhanced');$('assembly-art').setAttribute('role','button');$('assembly-art').setAttribute('tabindex','0');$('assembly-art').setAttribute('aria-label','Scatter or assemble the blocks');assemble(60);drawWave();drawEvidence();drawArm();setMotion(motionOn);fromHash();
document.fonts.ready.then(()=>{fitPoster();repaint();});document.querySelectorAll('.room img').forEach(img=>img.addEventListener('load',repaint));
