import {downloadPoster} from './poster-export.mjs';
for(const link of document.querySelectorAll('a[href^="#"]')){
  link.addEventListener('click',()=>{const target=document.getElementById(link.hash.slice(1));if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}});
}
const art=document.getElementById('home-poster'),word=document.getElementById('home-poster-word');
const input=document.getElementById('home-headline'),colour=document.getElementById('home-colour');
const result=document.getElementById('home-result'),download=document.getElementById('home-download');
function fit(){
  if(!art.clientWidth)return;
  word.style.fontSize='';let size=parseFloat(getComputedStyle(word).fontSize);
  const limit=art.clientHeight*.43-word.offsetTop;
  while(size>18&&(word.scrollWidth>word.clientWidth+1||word.scrollHeight>limit)){word.style.fontSize=--size+'px';}
}
function update(){word.textContent=input.value.trim()||'HELLO,\nCURIOUS.';fit();result.textContent='Your words, live. Download a PNG when you’re happy.';}
input.addEventListener('input',update);
colour.addEventListener('click',()=>{const white=art.classList.toggle('white');colour.setAttribute('aria-pressed',String(white));colour.setAttribute('aria-label',white?'Use a blue poster background':'Use a white poster background');result.textContent=(white?'White':'Blue')+' background selected.';});
document.getElementById('home-reset').addEventListener('click',()=>{input.value='HELLO, CURIOUS.';word.textContent='HELLO,\nCURIOUS.';art.classList.remove('white');colour.setAttribute('aria-pressed','false');colour.setAttribute('aria-label','Use a white poster background');fit();result.textContent='Starting words and blue background restored.';});
download.addEventListener('click',async()=>{
  download.disabled=true;download.textContent='Preparing image…';
  try{await document.fonts.ready;fit();await downloadPoster(art,[...art.querySelectorAll('[data-export-text]')]);result.textContent='Your PNG is ready. Check your browser’s downloads.';}
  catch{result.textContent='The image could not be prepared. Your poster is still here. Try again.';}
  finally{download.disabled=false;download.textContent='Download your poster ↓';}
});
document.querySelector('.editor-controls').hidden=false;
document.getElementById('poster-caption').textContent='This is a live editor. Try your own words.';
colour.setAttribute('aria-pressed','false');
if('ResizeObserver' in window)new ResizeObserver(fit).observe(art);else addEventListener('resize',fit);
document.fonts.ready.then(fit);fit();
