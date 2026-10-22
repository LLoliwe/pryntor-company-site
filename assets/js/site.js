/* Pryntor site behaviour. Vanilla JS, no dependencies, no network calls. */
(function(){
"use strict";
var d=document, body=d.body, root=d.documentElement;
root.classList.add("js");
var reduce=matchMedia("(prefers-reduced-motion: reduce)");
var motionOn=!reduce.matches, soundOn=false;
var motionBtns=d.querySelectorAll("[data-motion-toggle]"), soundBtns=d.querySelectorAll("[data-sound-toggle]");

/* sound: off by default, only short local tones after the visitor turns it on */
var ac=null;
function tone(f,len,vol){ if(!soundOn)return; try{ ac=ac||new (window.AudioContext||window.webkitAudioContext)();
  var o=ac.createOscillator(),g=ac.createGain(); o.type="sine"; o.frequency.value=f;
  g.gain.setValueAtTime(0,ac.currentTime); g.gain.linearRampToValueAtTime(vol||.04,ac.currentTime+.02); g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+len);
  o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime+len+.05);}catch(e){} }
window.PRYNTOR_TONE=tone;
function setSound(on){ soundOn=on; soundBtns.forEach(function(b){b.setAttribute("aria-pressed",String(on)); b.textContent=on?"Sound on":"Sound off";}); }
soundBtns.forEach(function(b){b.addEventListener("click",function(){setSound(!soundOn);tone(440,.25)})});

/* motion */
function setMotion(on){ motionOn=on; body.dataset.motion=on?"running":"paused"; motionBtns.forEach(function(b){b.setAttribute("aria-pressed",String(on)); b.textContent=on?"Motion on":"Motion off";}); }
setMotion(motionOn);
motionBtns.forEach(function(b){b.addEventListener("click",function(){setMotion(!motionOn)})});
if(reduce.addEventListener)reduce.addEventListener("change",function(e){setMotion(!e.matches)});

/* reveals */
var secs=d.querySelectorAll(".ch");
if("IntersectionObserver" in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.12,rootMargin:"0px 0px -8% 0px"});
  secs.forEach(function(s){io.observe(s)});
} else secs.forEach(function(s){s.classList.add("in")});
if(secs[0]) secs[0].classList.add("in");

/* progress rail */
var rail=d.querySelector(".rail"), tick=false;
function paint(){ tick=false; var max=Math.max(1,root.scrollHeight-innerHeight); if(rail) rail.style.setProperty("--p",Math.min(1,scrollY/max).toFixed(4)); }
addEventListener("scroll",function(){ if(!tick){tick=true;requestAnimationFrame(paint)} },{passive:true});

/* active section in nav */
var navLinks=[].slice.call(d.querySelectorAll(".nav a[href*='#']"));
if(navLinks.length && "IntersectionObserver" in window){
  var map={}; navLinks.forEach(function(a){var id=a.getAttribute("href").split("#")[1]; var el=d.getElementById(id); if(el) map[id]=a;});
  var nio=new IntersectionObserver(function(es){es.forEach(function(e){ var a=map[e.target.id]; if(!a)return; if(e.isIntersecting){navLinks.forEach(function(x){x.removeAttribute("aria-current")}); a.setAttribute("aria-current","location");} })},{rootMargin:"-45% 0px -50% 0px"});
  Object.keys(map).forEach(function(id){nio.observe(d.getElementById(id))});
}

/* mobile menu */
var mb=d.getElementById("menu-btn"), menu=d.getElementById("menu"), mc=d.getElementById("menu-close");
function openMenu(){ menu.hidden=false; body.classList.add("menu-open"); mb.setAttribute("aria-expanded","true"); var f=menu.querySelector("a"); f&&f.focus(); }
function closeMenu(back){ menu.hidden=true; body.classList.remove("menu-open"); mb.setAttribute("aria-expanded","false"); if(back!==false) mb.focus(); }
if(mb&&menu){
  mb.addEventListener("click",openMenu); mc.addEventListener("click",function(){closeMenu()});
  menu.addEventListener("click",function(e){ if(e.target.closest("a")) closeMenu(false); });
  d.addEventListener("keydown",function(e){
    if(menu.hidden) return;
    if(e.key==="Escape"){ closeMenu(); }
    if(e.key==="Tab"){ var f=[].slice.call(menu.querySelectorAll("a,button")); var first=f[0], last=f[f.length-1];
      if(e.shiftKey&&d.activeElement===first){e.preventDefault();last.focus()} else if(!e.shiftKey&&d.activeElement===last){e.preventDefault();first.focus()} }
  });
  matchMedia("(min-width:981px)").addEventListener("change",function(e){ if(e.matches&&!menu.hidden) closeMenu(false); });
}

/* hero chain: steps light up in order while motion is on */
var links=[].slice.call(d.querySelectorAll(".chain li")), ci=0, ctimer=null, heroVisible=true;
function step(){ if(!motionOn||!heroVisible||d.hidden){ return; } links.forEach(function(l,i){l.classList.toggle("on",i<=ci)}); ci=(ci+1)%(links.length+1); }
if(links.length){
  links.forEach(function(l){l.classList.add("on")});
  ctimer=setInterval(step,1100);
  if("IntersectionObserver" in window) new IntersectionObserver(function(es){heroVisible=es[0].isIntersecting},{threshold:0}).observe(links[0].closest("section"));
  var obs=new MutationObserver(function(){ if(!motionOn) links.forEach(function(l){l.classList.add("on")}); }); obs.observe(body,{attributes:true,attributeFilter:["data-motion"]});
}

/* proof chain diagram follows the selected step */
var pc=d.getElementById("pc");
function syncDiagram(t){ if(!pc) return; var k=t.id.replace("tab-",""), w=t.querySelector(".w").textContent;
  pc.querySelectorAll("[data-step]").forEach(function(n){n.classList.toggle("on",n.getAttribute("data-step")===k)});
  pc.setAttribute("aria-label","The proof chain: change, then test, then prove, then keep. Selected: "+w+"."); }
/* proof chain tabs (WAI-ARIA tabs pattern, manual activation not needed: arrows move and select) */
d.querySelectorAll("[role=tablist]").forEach(function(list){
  var tabs=[].slice.call(list.querySelectorAll("[role=tab]"));
  function select(t,focus){ tabs.forEach(function(x){ var on=x===t; x.setAttribute("aria-selected",String(on)); x.tabIndex=on?0:-1; var p=d.getElementById(x.getAttribute("aria-controls")); p.hidden=!on; if(on&&motionOn){p.classList.remove("enter"); void p.offsetWidth; p.classList.add("enter");} }); syncDiagram(t); if(focus)t.focus(); tone(330+tabs.indexOf(t)*110,.18,.03); }
  tabs.forEach(function(t,i){
    t.addEventListener("click",function(){select(t)});
    t.addEventListener("keydown",function(e){ var k=e.key, n=null;
      if(k==="ArrowDown"||k==="ArrowRight") n=tabs[(i+1)%tabs.length];
      else if(k==="ArrowUp"||k==="ArrowLeft") n=tabs[(i-1+tabs.length)%tabs.length];
      else if(k==="Home") n=tabs[0]; else if(k==="End") n=tabs[tabs.length-1];
      if(n){e.preventDefault();select(n,true)} });
  });
});
})();
