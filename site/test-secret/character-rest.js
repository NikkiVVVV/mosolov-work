export function createRestState(){return {quiet:0,sleep:0};}
export function wakeCharacter(state){state.quiet=0;}
export function stepRest(state,dt,{active=false,reduced=false}={}){
  dt=Math.max(0,Math.min(dt,.1));
  state.quiet=active?0:state.quiet+dt;
  const target=state.quiet>=60?1:0;
  const rate=target?3.5:18;
  state.sleep=reduced?target:state.sleep+(target-state.sleep)*(1-Math.exp(-rate*dt));
  return state.sleep;
}
