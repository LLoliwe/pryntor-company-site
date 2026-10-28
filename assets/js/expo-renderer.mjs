// Modern HTML-in-Canvas, progressively enhanced. No screenshot rasterisation.
// https://developer.chrome.com/docs/web-platform/html-in-canvas/2d
export function mountCanvas(host, element, report, env = window) {
  const canvas=env.document.createElement('canvas');
  let ctx;
  try {ctx=canvas.getContext('2d');} catch {return null;}
  if(!ctx || typeof ctx.drawElementImage!=='function' || typeof canvas.requestPaint!=='function' || !('content' in canvas)) return null;
  let stopped=false, painted=false, timer, observer;
  const next=element.nextSibling;
  canvas.className='scene-canvas'; canvas.setAttribute('content','drawable');
  const width=host.clientWidth, height=element.offsetHeight;
  if(!width || !height) return null;
  function restore() {
    if(stopped)return; stopped=true; env.clearTimeout(timer); observer?.disconnect(); canvas.onpaint=null;
    const focused=env.document.activeElement;
    host.insertBefore(element,next); element.removeAttribute('drawable'); element.style.width='';
    canvas.remove(); report(false);
    if(focused && element.contains(focused)) focused.focus({preventScroll:true});
  }
  function request() {if(!stopped&&!env.document.hidden)try{canvas.requestPaint();}catch{restore();}}
  function resize() {
    if(stopped)return;
    const w=host.clientWidth; if(!w)return;
    element.style.width=w+'px';
    const h=element.offsetHeight, dpr=Math.min(env.devicePixelRatio||1,2);
    const bw=Math.round(w*dpr),bh=Math.round(h*dpr);
    canvas.style.height=h+'px';
    if(canvas.width!==bw)canvas.width=bw;
    if(canvas.height!==bh)canvas.height=bh;
    request();
  }
  canvas.onpaint=()=>{
    if(stopped||env.document.hidden)return;
    try {
      ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);
      // One paint root includes real inputs, text, SVGs and their focus states.
      // The modern API synchronises pointer and accessibility geometry itself.
      ctx.drawElementImage(element,0,0,canvas.width,canvas.height);
      if(!painted){painted=true;env.clearTimeout(timer);report(true);}
    }catch{restore();}
  };
  try{
    element.style.width=width+'px';element.setAttribute('drawable','');host.insertBefore(canvas,element);canvas.append(element);
    canvas.addEventListener('contextlost',restore);
    timer=env.setTimeout(()=>{if(!painted)restore();},1600);
    if(env.ResizeObserver){observer=new env.ResizeObserver(resize);observer.observe(host);}
    resize();
    return {request,restore};
  }catch{restore();return null;}
}
