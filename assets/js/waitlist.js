/* Early list. Ships unconfigured: without Supabase keys it only prepares a mailto the visitor sends themselves. */
(function(){
"use strict";
var d=document, form=d.getElementById("wl"); if(!form) return;
var cfg=window.PRYNTOR_WAITLIST||{}, err=d.getElementById("err"), tone=window.PRYNTOR_TONE||function(){};
var params=new URLSearchParams(location.search), inbound=(params.get("ref")||"").replace(/[^a-z0-9]/gi,"").slice(0,16);
function configured(){return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl||"") && !!cfg.anonKey}
function join(email){
  if(!configured()) return Promise.resolve({mode:"mailto"});
  return fetch(cfg.supabaseUrl+"/rest/v1/rpc/join_waitlist",{method:"POST",headers:{"Content-Type":"application/json","apikey":cfg.anonKey,"Authorization":"Bearer "+cfg.anonKey},
    body:JSON.stringify({p_email:email,p_ref:inbound||null,p_consent:true})}).then(function(r){if(!r.ok)throw new Error("Request failed");return r.json()}).then(function(x){var row=Array.isArray(x)?x[0]:x;return {mode:"live",position:row.out_position,code:row.out_code}});
}
form.addEventListener("submit",function(e){
  e.preventDefault(); err.textContent="";
  var em=d.getElementById("email"), c=d.getElementById("consent");
  em.removeAttribute("aria-invalid"); c.removeAttribute("aria-invalid");
  if(!em.value||!em.checkValidity()){err.textContent="Please enter a valid email address.";em.setAttribute("aria-invalid","true");em.focus();return}
  if(!c.checked){err.textContent="Please tick the consent box so we may store your email.";c.setAttribute("aria-invalid","true");c.focus();return}
  var btn=form.querySelector(".cta"), label=btn.innerHTML; btn.disabled=true; btn.textContent="Holding...";
  join(em.value.trim()).then(function(res){ success(res, em.value.trim()) }).catch(function(){ err.textContent="That did not go through. Try again, or email hello@pryntor.co.za."; btn.disabled=false; btn.innerHTML=label; });
});
function success(res,email){
  tone(523,.5,.05); setTimeout(function(){tone(784,.7,.04)},140);
  d.getElementById("before").hidden=true; var a=d.getElementById("after"); a.classList.add("on");
  var link="https://pryntor.co.za/", pos=d.getElementById("pos");
  if(res.mode==="live"){ pos.textContent="#"+Number(res.position).toLocaleString("en-ZA"); link+="?ref="+encodeURIComponent(res.code); }
  else { pos.textContent="Almost in"; pos.classList.add("txt"); d.getElementById("pos-note").textContent="Your place number appears here once our list service is switched on."; d.getElementById("mailto-note").hidden=false;
    d.getElementById("mailto-link").href="mailto:hello@pryntor.co.za?subject=Pryntor%20early%20list&body="+encodeURIComponent("Please add "+email+" to the Pryntor early list. I consent to Pryntor storing my email for launch news."+(inbound?" Referred by "+inbound+".":"")); }
  d.getElementById("reflink").value=link; a.focus();
}
var copy=d.getElementById("copy");
copy.addEventListener("click",function(){var i=d.getElementById("reflink");i.select();
  function done(){copy.textContent="Copied"; d.getElementById("copy-status").textContent="Link copied.";}
  var fallback=function(){try{d.execCommand("copy")}catch(e){} done();};
  if(navigator.clipboard&&window.isSecureContext){ var t=setTimeout(fallback,800); navigator.clipboard.writeText(i.value).then(function(){clearTimeout(t);done()},function(){clearTimeout(t);fallback()}); } else fallback(); tone(660,.2,.03)});
d.getElementById("share").addEventListener("click",function(){var url=d.getElementById("reflink").value;if(navigator.share){navigator.share({title:"Pryntor",text:"Make it move. Join the Pryntor early list.",url:url}).catch(function(){})}else{copy.click()}});
})();
