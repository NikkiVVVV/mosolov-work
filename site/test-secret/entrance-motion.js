const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function entranceFrame(elapsed,readyAt,reduced=false){
  const hold=reduced?.4:2.4;
  const exitAt=readyAt===null?Infinity:Math.max(hold,readyAt+.45);
  const fade=reduced?.2:.45;
  return {phase:elapsed<exitAt?'loading':'exit',show:false,opacity:1-smooth((elapsed-exitAt)/fade),done:elapsed>=exitAt+fade};
}
