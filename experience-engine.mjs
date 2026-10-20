/** Pryntor Systems Study: deterministic local research demonstrations.
 * No user records, production decisions, data ingestion or service integration.
 */
export const GATE_LIMITS = Object.freeze({evidence: 70, repeatability: 75});
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export function evaluateGate(input) {
  const evidence = Number(input?.evidence);
  const repeatability = Number(input?.repeatability);
  if (typeof input?.evidence !== 'number' || typeof input?.repeatability !== 'number'
      || ![evidence, repeatability].every(v => Number.isFinite(v) && v >= 0 && v <= 100)
      || typeof input?.rights !== 'boolean') {
    throw new TypeError('Gate input requires 0–100 evidence and repeatability, plus boolean rights');
  }
  const checks = [
    {id:'evidence', title:'Evidence strength', value:evidence, required:`At least ${GATE_LIMITS.evidence}/100`, pass:evidence >= GATE_LIMITS.evidence},
    {id:'repeatability', title:'Reproduction', value:repeatability, required:`At least ${GATE_LIMITS.repeatability}/100`, pass:repeatability >= GATE_LIMITS.repeatability},
    {id:'rights', title:'Rights declaration', value:input.rights, required:'Explicitly cleared', pass:input.rights}
  ];
  const firstError = checks.find(item => !item.pass) || null;
  return {status:firstError ? 'HOLD' : 'CANDIDATE', firstError:firstError?.id || null, checks};
}

export function buildLattice(cols=7, rows=5) {
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2 || cols > 12 || rows > 12) {
    throw new RangeError('Lattice dimensions must be between 2 and 12');
  }
  const points = [];
  const springs = [];
  for (let y=0; y<rows; y++) for (let x=0; x<cols; x++) {
    points.push({x:(x-(cols-1)/2)*.48,y:(y-(rows-1)/2)*.48,vx:0,vy:0,anchor:y===0&&(x===0||x===cols-1)});
  }
  function join(a,b){const p=points[a],q=points[b];springs.push({a,b,rest:Math.hypot(q.x-p.x,q.y-p.y)});}
  for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
    const i=y*cols+x;
    if(x<cols-1) join(i,i+1);
    if(y<rows-1) join(i,i+cols);
    if(x<cols-1&&y<rows-1){join(i,i+cols+1);join(i+1,i+cols);}
  }
  return {points,springs,cols,rows};
}

/** Semi-implicit Euler with bounded timestep. Mutates a caller-owned simulation only. */
export function stepLattice(lattice, delta, tension=70, pointer=null) {
  const dt = clamp(Number.isFinite(delta)?delta:0, 0, 1/40);
  const k = clamp(Number.isFinite(tension)?tension:70, 15, 150);
  if(dt===0) return {energy:kineticEnergy(lattice.points),dt:0};
  const fx=new Float64Array(lattice.points.length);
  const fy=new Float64Array(lattice.points.length);
  lattice.springs.forEach(s=>{
    const a=lattice.points[s.a],b=lattice.points[s.b];
    const dx=b.x-a.x,dy=b.y-a.y,dist=Math.max(1e-6,Math.hypot(dx,dy));
    const pull=(dist-s.rest)*k, x=dx/dist*pull,y=dy/dist*pull;
    fx[s.a]+=x;fy[s.a]+=y;fx[s.b]-=x;fy[s.b]-=y;
  });
  lattice.points.forEach((p,i)=>{
    if(p.anchor){p.vx=0;p.vy=0;return;}
    if(pointer?.index===i){p.x=clamp(pointer.x,-2,2);p.y=clamp(pointer.y,-1.5,1.6);p.vx=p.vy=0;return;}
    p.vx=clamp((p.vx+fx[i]*dt)*.985,-6,6);
    p.vy=clamp((p.vy+(fy[i]+.8)*dt)*.985,-6,6);
    p.x=clamp(p.x+p.vx*dt,-2.3,2.3);
    p.y=clamp(p.y+p.vy*dt,-1.55,1.65);
  });
  return {energy:kineticEnergy(lattice.points),dt};
}
export function kineticEnergy(points) {
  return points.reduce((sum,p)=>sum+(p.vx*p.vx+p.vy*p.vy)*.5,0);
}
export function applyImpulse(lattice, strength=2) {
  const s=clamp(strength,0,5), n=lattice.points.length;
  lattice.points.forEach((p,i)=>{
    if(p.anchor)return;
    const theta=i*2.3999632297;
    p.vx+=Math.cos(theta)*s*(.5+(i%n)/n*.3);
    p.vy+=Math.sin(theta)*s*(.5+(i%n)/n*.3);
  });
}
export function cinemaProjection(position, lens=50, yaw=0, dimensions={width:900,height:620}) {
  const f=clamp(Number(lens)||50,28,90)/50;
  const angle=clamp(Number(yaw)||0,-.48,.48);
  const ca=Math.cos(angle),sa=Math.sin(angle);
  const x=position.x*ca-position.z*sa;
  const z=position.x*sa+position.z*ca+7;
  const focal=510*f;
  return {x:dimensions.width/2+x*focal/z, y:dimensions.height*.48-position.y*focal/z, scale:focal/z,depth:z};
}
export function sceneSeed(index=0) {
  const k=(index+1)*2654435761;
  return ((Math.sin(k)*43758.5453)%1+1)%1;
}