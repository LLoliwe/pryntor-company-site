// Original deterministic models. These are illustrative experiments, not product data.
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
// The percentages are invented. The arithmetic gives visitors a checkable truth.
export const samples = [
  {id:'A',confidence:96,question:'8 × 7',answer:56,expected:8*7},
  {id:'B',confidence:91,question:'12 × 3',answer:34,expected:12*3},
  {id:'C',confidence:83,question:'9 + 6',answer:15,expected:9+6},
  {id:'D',confidence:74,question:'20 ÷ 4',answer:4,expected:20/4},
  {id:'E',confidence:62,question:'18 − 9',answer:9,expected:18-9},
  {id:'F',confidence:48,question:'5 × 5',answer:20,expected:5*5},
  {id:'G',confidence:33,question:'3 × 9',answer:27,expected:3*9},
  {id:'H',confidence:18,question:'16 − 7',answer:8,expected:16-7},
].map(sample=>({...sample,correct:sample.answer===sample.expected}));
export const armTargets = [{shoulder:80,elbow:-70},{shoulder:30,elbow:80},{shoulder:130,elbow:-90}];
export function reachesTarget(pose, target, tolerance=18) {
  return Math.hypot(pose.tip.x-target.tip.x,pose.tip.y-target.tip.y)<=tolerance;
}
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
