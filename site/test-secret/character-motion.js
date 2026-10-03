export const limit=(x,a,b)=>Math.max(a,Math.min(b,x));

export function createCharacterState(){return {clicks:0,reaction:'idle',remaining:0,gripHold:0,grip:0,shrug:0,headX:0,headVelocity:0,previousSpeed:0,impact:0,hits:0};}
export function reactCharacter(state){
  state.clicks++;state.reaction=state.clicks%2?'question':'shrug';state.remaining=3.8;
}
export function stepCharacter(state,dt,{spinSpeed=0,swingSpeed=0,reduced=false}={}){
  dt=limit(dt,0,.05);
  if(Math.abs(spinSpeed)>2.2||Math.abs(swingSpeed)>2)state.gripHold=.7;
  else state.gripHold=Math.max(0,state.gripHold-dt);
  // Head lags behind sharp movement, touches the padded edge, then rebounds.
  const speed=swingSpeed+spinSpeed*.65;
  if(reduced){state.headX=0;state.headVelocity=0;state.impact=0;}
  else if(dt>0){
    const acceleration=limit((speed-state.previousSpeed)/dt,-65,65);
    const active=Math.abs(swingSpeed)>1.4||Math.abs(spinSpeed)>2.2;
    const force=active?-acceleration*.7-speed*1.8:0;
    const steps=Math.ceil(dt/(1/120)),h=dt/steps;
    for(let i=0;i<steps;i++){
      state.headVelocity+=(force-70*state.headX-6*state.headVelocity)*h;
      state.headX+=state.headVelocity*h;
      if(Math.abs(state.headX)>.18){
        const side=Math.sign(state.headX);
        state.headX=side*.18;
        if(state.headVelocity*side>0){
          state.impact=Math.min(1,Math.abs(state.headVelocity)/1.5);
          state.headVelocity*=-.48;state.hits++;
        }
      }
    }
    state.impact*=Math.exp(-10*dt);
  }
  state.previousSpeed=speed;
  state.remaining=Math.max(0,state.remaining-dt);
  if(!state.remaining)state.reaction='idle';
  const gripping=state.gripHold>0;
  const blend=reduced?1:1-Math.exp(-12*dt);
  state.grip+=(Number(gripping)-state.grip)*blend;
  state.shrug+=((!gripping&&state.reaction==='shrug'?1:0)-state.shrug)*blend;
  return {face:gripping||state.impact>.15?'question':state.reaction,headX:state.headX,impact:state.impact,grip:state.grip,shrug:state.shrug};
}

