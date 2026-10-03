const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function createIdleReactions(){return {quiet:0,elapsed:0,active:null,queue:['sip','pucker','cat'],last:null,next:6};}
export function interruptIdle(state){state.quiet=0;state.elapsed=0;state.active=null;}
export function stepIdle(state,dt,{reduced=false,random=Math.random}={}){
  dt=Math.max(0,Math.min(.05,dt));
  if(reduced){interruptIdle(state);return {kind:'none',amount:0};}
  state.quiet+=dt;
  if(!state.active){
    if(state.quiet<state.next)return {kind:'none',amount:0};
    if(!state.queue.length){
      state.queue=['sip','pucker','cat'];
      for(let i=2;i>0;i--){const j=Math.floor(random()*(i+1));[state.queue[i],state.queue[j]]=[state.queue[j],state.queue[i]];}
      if(state.queue[0]===state.last)[state.queue[0],state.queue[1]]=[state.queue[1],state.queue[0]];
    }
    state.active=state.queue.shift();state.elapsed=0;state.quiet=0;state.next=5+2*random();
  }
  state.elapsed+=dt;
  const duration=state.active==='sip'?1.8:1.5;
  const amount=smooth(state.elapsed/.25)*(1-smooth((state.elapsed-(duration-.35))/.35));
  const result={kind:state.active,amount};
  if(state.elapsed>=duration){state.last=state.active;state.active=null;state.elapsed=0;return {kind:'none',amount:0};}
  return result;
}
