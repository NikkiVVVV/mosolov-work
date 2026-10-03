const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const radians=degrees=>degrees*Math.PI/180;

// Project gravity into the display plane (W3C Z-X-Y rotation), rather than
// subtracting Euler angles: gamma alone loses roll when a phone is upright.
export function screenRoll(sample,screenAngle=0){
  if(![sample.gamma,sample.beta,screenAngle].every(Number.isFinite))return null;
  const beta=radians(sample.beta),gamma=radians(sample.gamma),r=radians(screenAngle);
  const x=Math.cos(beta)*Math.sin(gamma),y=Math.sin(beta);
  // A nearly horizontal screen has no stable left/right gravity direction.
  if(Math.hypot(x,y)<.3)return null;
  return Math.atan2(x*Math.cos(r)+y*Math.sin(r),y*Math.cos(r)-x*Math.sin(r));
}
export function orientationTargets(sample,zero,screenAngle=0){
  const roll=screenRoll(sample,screenAngle),origin=zero&&screenRoll(zero,screenAngle);
  if(roll===null||origin===null||origin===undefined)return {swing:0,depth:0};
  const angle=Math.atan2(Math.sin(roll-origin),Math.cos(roll-origin));
  const amount=Math.max(0,Math.abs(angle)-radians(1.5));
  return {swing:clamp(Math.sign(angle)*amount*.24,-.12,.12),depth:0};
}

// The call is made synchronously, so a caller's real click retains activation.
export async function requestOrientationAccess(api,hasGesture=false){
  if(typeof api.requestPermission!=='function')return 'granted';
  try{return await api.requestPermission()==='granted'?'granted':'denied';}
  catch(error){return error?.name==='NotAllowedError'&&!hasGesture?'gesture-required':'unavailable';}
}
