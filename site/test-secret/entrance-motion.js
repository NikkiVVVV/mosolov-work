const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function entranceFrame(elapsed,readyAt,reduced=false,permissionPending=false){
  if(permissionPending)return {phase:'permission',show:false,opacity:1,done:false};
  const hold=reduced?.4:2.4;
  const exitAt=readyAt===null?Infinity:Math.max(hold,readyAt+.45);
  const fade=reduced?.2:.45;
  return {phase:elapsed<exitAt?'loading':'exit',show:false,opacity:1-smooth((elapsed-exitAt)/fade),done:elapsed>=exitAt+fade};
}

// 450 ms closed → 950 ms slide → 400 ms black display → power → progress.
// Reduced motion shows an already-open tray, keeping the screen-on sequence short.
export function bootFrame(elapsed,reduced=false){
  return {lidOpening:elapsed>=(reduced?0:.45),powered:elapsed>=(reduced?.2:1.8),progressing:elapsed>=(reduced?.35:2.15)};
}
