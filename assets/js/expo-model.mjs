// Original deterministic models. These are illustrative experiments, not product data.
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const samples = [
  {id:'A',confidence:96,correct:true}, {id:'B',confidence:91,correct:false},
  {id:'C',confidence:83,correct:true}, {id:'D',confidence:74,correct:false},
  {id:'E',confidence:62,correct:true}, {id:'F',confidence:48,correct:false},
  {id:'G',confidence:33,correct:true}, {id:'H',confidence:18,correct:false},
];
export function evaluateThreshold(threshold) {
  const passed = samples.filter(s => s.confidence >= threshold);
  return {passed, held:samples.filter(s=>s.confidence<threshold), errors:passed.filter(s=>!s.correct).length};
}
export function armPose(shoulder, elbow) {
  const a=shoulder*Math.PI/180, b=(shoulder+elbow)*Math.PI/180;
  const joint={x:160*Math.cos(a),y:160*Math.sin(a)};
  return {joint,tip:{x:joint.x+130*Math.cos(b),y:joint.y+130*Math.sin(b)}};
}
export function wavePath(frequency,amplitude,phase=0) {
  return Array.from({length:161},(_,i)=>`${i?'L':'M'}${i*5},${(245+Math.sin(i/160*Math.PI*2*frequency+phase)*amplitude).toFixed(2)}`).join(' ');
}
export function blockPosition(index,spread) {
  const row=Math.floor(index/6), col=index%6, t=clamp(spread,0,100)/100;
  const x=(col-row)*45-24, y=(col+row)*25-140;
  // Stable scatter positions let a visitor repeat and compare the transformation.
  const angle=index*2.3999632297, radius=80+(index%7)*24;
  return {x:x*(1-t)+Math.cos(angle)*radius*t,y:y*(1-t)+Math.sin(angle)*radius*.7*t,rotation:Math.sin(index*4.7)*55*t};
}
