const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const delta=(value,zero)=>((value-zero+540)%360)-180;

// Relative to the phone's starting pose, with the display rotation accounted for.
export function orientationTargets(sample,zero,screenAngle=0){
  if(!zero||![sample.gamma,sample.beta,zero.gamma,zero.beta,screenAngle].every(Number.isFinite))return {swing:0,depth:0};
  const r=screenAngle*Math.PI/180;
  const x=delta(sample.gamma,zero.gamma),y=delta(sample.beta,zero.beta);
  const lateral=x*Math.cos(r)+y*Math.sin(r);
  const forward=y*Math.cos(r)-x*Math.sin(r);
  return {swing:clamp(-lateral*Math.PI/180*.55,-.4,.4),depth:clamp(forward*Math.PI/180*.1,-.06,.06)};
}
