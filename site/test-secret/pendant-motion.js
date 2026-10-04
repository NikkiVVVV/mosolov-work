export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Bounded, damped pendulum. Small fixed substeps keep long frames stable.
export function stepPendulum(state, elapsed, target = 0, held = false) {
  const dt = Math.min(Math.max(elapsed, 0), .05);
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const force = held ? (target - state.angle) * 85 : -12 * Math.sin(state.angle - target);
    state.velocity += (force - state.velocity * (held ? 16 : 1.65)) * h;
    state.velocity = clamp(state.velocity, -3, 3);
    state.angle += state.velocity * h;
    if (Math.abs(state.angle) > .62) {
      state.angle = clamp(state.angle, -.62, .62);
      state.velocity *= -.25;
    }
  }
  return state;
}

export function createSpatialMotion() {
  return { swing:{angle:0,velocity:0}, depth:{angle:0,velocity:0}, twist:{angle:0,velocity:0}, stretch:{angle:0,velocity:0} };
}

// Coupled pendulum planes + torsion of the suspension + small elastic extension.
// The twist oscillates more slowly than the swing, so the case doesn't stay face-on.
export function stepSpatialMotion(m, elapsed, targets={}, held=false) {
  const dt=clamp(elapsed,0,.05), steps=Math.max(1,Math.ceil(dt*120)), h=dt/steps;
  const spring=(s,target,k,d,limit,force=0,maxSpeed=3)=>{
    s.velocity+=(k*(target-s.angle)-d*s.velocity+force)*h;
    s.velocity=clamp(s.velocity,-maxSpeed,maxSpeed);s.angle+=s.velocity*h;
    const [min,max]=Array.isArray(limit)?limit:[-limit,limit];
    if(s.angle<min||s.angle>max){s.angle=clamp(s.angle,min,max);s.velocity*=-.18;}
  };
  for(let i=0;i<steps;i++){
    spring(m.swing,targets.swing||0,held?110:20,held?18:1.15,1.45);
    spring(m.depth,targets.depth||0,held?85:13.4,held?16:3.4,.1);
    if(held)spring(m.twist,targets.twist||0,28,9,Infinity);
    else{
      const coupling=1.35*(m.swing.velocity*m.depth.angle-m.depth.velocity*m.swing.angle);
      m.twist.velocity+=(-1.6*Math.sin(m.twist.angle)-.6*m.twist.velocity+coupling)*h;
      m.twist.velocity=clamp(m.twist.velocity,-10,10);
      m.twist.angle+=m.twist.velocity*h;
    }
    spring(m.stretch,held?(targets.stretch||0):0,held?95:28,held?17:4.5,[-2.2,32],0,36);
  }
  return m;
}

export function releaseSpatialMotion(m, vx, vy, grip=0) {
  const tension=clamp(m.stretch.angle/7,0,1),direction=Math.sign(m.swing.angle)||Math.sign(grip)||1;
  m.swing.velocity+=direction*tension*1.5;
  m.stretch.velocity+=clamp(vy*2,-5,5);
  m.twist.velocity+=direction*tension*4;
  m.swing.velocity=clamp(m.swing.velocity+vx*.7,-2.3,2.3);
  m.depth.velocity=clamp(m.depth.velocity-vy*.1+vx*.025,-.32,.32);
  const speed=Math.hypot(vx,vy);
  const spinDirection=Math.sign(vx+vy*grip*.5)||Math.sign(vy)||1;
  const strongThrow=speed>1.6?spinDirection*Math.min(8,6+(speed-1.6)*2.5):0;
  m.twist.velocity=clamp(m.twist.velocity+vx*.45+vy*grip*.25+strongThrow,-10,10);
}

export function createRope(start,end,count=14) {
  const nodes=Array.from({length:count},(_,i)=>({
    p:start.map((v,k)=>v+(end[k]-v)*i/(count-1)),
    previous:start.map((v,k)=>v+(end[k]-v)*i/(count-1))
  }));
  return {nodes,length:Math.hypot(...start.map((v,k)=>v-end[k])),accumulator:0,speed:0};
}

// Verlet chain with pinned endpoints. No per-frame geometry allocation in the renderer.
export function stepRope(rope,elapsed,start,end,held=false) {
  const nodes=rope.nodes,last=nodes.length-1,h=1/120;
  rope.accumulator+=clamp(elapsed,0,.05);
  const distance=Math.hypot(...start.map((v,k)=>v-end[k]));
  const segment=Math.max(rope.length,distance)/last;
  let maxSpeed=0,integrated=false;
  const pin=()=>{for(let k=0;k<3;k++){nodes[0].p[k]=start[k];nodes[last].p[k]=end[k];}};
  for(let step=0;rope.accumulator>=h&&step<6;step++,rope.accumulator-=h){
    integrated=true;pin();
    for(let i=1;i<last;i++){
      const n=nodes[i],before=[...n.p];
      for(let k=0;k<3;k++)n.p[k]+=(n.p[k]-n.previous[k])*(held?.96:.985);
      n.p[1]-=9.81*h*h;n.previous=before;
    }
    for(let iteration=0;iteration<24;iteration++){
      pin();
      for(let j=0;j<last;j++){
        const i=iteration%2?last-1-j:j,a=nodes[i].p,b=nodes[i+1].p;
        const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],length=Math.hypot(dx,dy,dz)||1;
        const amount=(length-segment)/length;
        const wa=i===0?0:i+1===last?1:.5,wb=i+1===last?0:i===0?1:.5;
        const ca=amount*wa,cb=amount*wb;
        a[0]+=dx*ca;a[1]+=dy*ca;a[2]+=dz*ca;
        b[0]-=dx*cb;b[1]-=dy*cb;b[2]-=dz*cb;
      }
    }
    pin();
    for(let i=1;i<last;i++)maxSpeed=Math.max(maxSpeed,Math.hypot(...nodes[i].p.map((v,k)=>v-nodes[i].previous[k]))/h);
  }
  pin();if(integrated)rope.speed=maxSpeed;
  return rope;
}


// Inverse of the YXZ pivot transform: screen-right means a positive swing.
export function positionToDragTargets(x,y,z,twist=0) {
  const down=3.6-y, length=Math.max(.001,Math.hypot(x,down,z));
  return {
    swing:clamp(Math.atan2(x,Math.hypot(down,z)),-1.4,1.4),
    depth:clamp(Math.atan2(-z,down),-.08,.08),
    twist,
    stretch:clamp(length-3.7,-1.2,32)
  };
}

// One entrance spring, independent of user drag and the pendulum's rope length.
export function stepArrival(state, elapsed) {
  const dt=clamp(elapsed,0,.05), steps=Math.max(1,Math.ceil(dt*120)), h=dt/steps;
  for(let i=0;i<steps;i++){
    state.velocity+=(-56*state.offset-9*state.velocity)*h;
    state.offset+=state.velocity*h;
  }
  if(Math.abs(state.offset)<.001&&Math.abs(state.velocity)<.001){state.offset=0;state.velocity=0;}
  return state;
}

export function ambientTargets(seconds) {
  return {swing:.018*Math.sin(seconds*1.45)+.007*Math.sin(seconds*.71),depth:.004*Math.sin(seconds*1.1)};
}

// A short downward pull and lateral impulse when the falling cord catches.
export function landingImpulse(m){
  m.stretch.velocity+=5;
  m.swing.velocity+=.7;
  m.twist.velocity-=.4;
}
