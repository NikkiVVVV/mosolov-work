// Dense polyethylene model: inextensible links, broad bending radius and retained folds.
// Manual folds relax slowly; returning from an environment adds one damped unfold.
// No frame-dependent delta integration: the caller uses a fixed 1/60 step.
export class PlasticSheet {
  constructor(width = 3.15, height = 4.2, columns = 32, rows = 44, solverPasses = 18) {
    this.solverPasses = solverPasses;
    this.width = width; this.height = height; this.columns = columns; this.rows = rows;
    this.count = (columns + 1) * (rows + 1);
    this.positions = new Float32Array(this.count * 3);
    this.previous = new Float32Array(this.count * 3);
    this.rest = new Float32Array(this.count * 3);
    this.pose = new Float32Array(this.count * 3);
    this.grabs = new Map(); this.time = 0; this.reducedMotion = false;
    this.relaxing = false; this.releaseDelay = 0; this.settleSteps = 0;
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) {
      const i = (y * (columns + 1) + x) * 3;
      const u = x / columns, v = y / rows;
      this.rest[i] = (u - .5) * width;
      this.rest[i + 1] = (.5 - v) * height;
      this.rest[i + 2] = .006 * Math.sin(u * 39 + v * 12) + .012 * Math.sin(u * 12 - v * 19) + .035 * Math.sin(u * Math.PI);
    }
    this.positions.set(this.rest); this.previous.set(this.rest); this.pose.set(this.rest);
    const links = [];
    const bends = [];
    const add = (a, b, stiffness, bending = false) => {
      const ai = a * 3, bi = b * 3;
      if (bending) bends.push(links.length);
      links.push(a, b, Math.hypot(this.rest[ai] - this.rest[bi], this.rest[ai+1] - this.rest[bi+1], this.rest[ai+2] - this.rest[bi+2]), stiffness);
    };
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) {
      const a = y * (columns + 1) + x;
      if (x < columns) add(a, a+1, 1);
      if (y < rows) add(a, a+columns+1, 1);
      if (x < columns && y < rows) { add(a, a+columns+2, .98); add(a+1, a+columns+1, .98); }
      if (x < columns-1) add(a, a+2, .52, true);
      if (y < rows-1) add(a, a+2*(columns+1), .52, true);
      // Longer bending links spread a fold over several cells instead of making a paper hinge.
      if (x < columns-2) add(a, a+3, .16, true);
      if (y < rows-2) add(a, a+3*(columns+1), .16, true);
    }
    this.links = new Float32Array(links);
    this.originalLinks = new Float32Array(links);
    this.bends = new Uint32Array(bends);
    this.pinned = new Uint8Array(this.count);
    this.baseRest=this.rest.slice();this.boundary=null;this.surface=null;this.environment='plain';this.surfaceSettling=false;this.surfaceAge=0;
  }
  setSurface(sample,environment=sample?'rocks':'plain') {
    const returning=environment==='plain'&&this.environment!=='plain';
    this.releaseAll();this.surface=sample;this.environment=environment;
    this.returnPose=returning&&!this.reducedMotion?this.positions.slice():null;this.returnAge=0;
    // Change the destination, never teleport the current sheet on a scene switch.
    for(let k=0;k<this.rest.length;k+=3){
      this.rest[k+2]=this.baseRest[k+2]+(sample?sample(this.rest[k],this.rest[k+1]):0);
    }
    for(const j of this.bends){
      this.links[j+3]=this.originalLinks[j+3]*(sample?.3:1);
    }
    this.previous.set(this.positions);this.pose.set(this.positions);
    this.surfaceSettling=!!sample;this.surfaceAge=0;this.releaseDelay=0;this.relaxing=true;
  }
  collide() {
    if(!this.surface)return;
    for(let k=0;k<this.positions.length;k+=3){
      const floor=this.surface(this.positions[k],this.positions[k+1]);
      if(this.positions[k+2]<floor){
        this.positions[k+2]=floor;
        // Contact loses lateral momentum, like plastic rubbing against rough stone.
        this.previous[k]=this.positions[k];this.previous[k+1]=this.positions[k+1];this.previous[k+2]=floor;
      }
    }
  }
  surfaceGap(a,b){
    const p=this.positions;
    return this.surface((p[a]+p[b])*.5,(p[a+1]+p[b+1])*.5)-(p[a+2]+p[b+2])*.5;
  }
  supportTriangle(a,b,c){
    const p=this.positions,sample=this.surface;
    // A coarse cloth face can straddle a sharp peak even when all its nodes are clear.
    // Check the three edge midpoints and centre; only lift, so adjacent faces stay valid.
    const lift=Math.max(0,this.surfaceGap(a,b),this.surfaceGap(b,c),this.surfaceGap(c,a),sample((p[a]+p[b]+p[c])/3,(p[a+1]+p[b+1]+p[c+1])/3)-(p[a+2]+p[b+2]+p[c+2])/3);
    if(lift>.0001){p[a+2]+=lift;p[b+2]+=lift;p[c+2]+=lift;}
  }
  supportFaces(){
    if(!this.surface)return;
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.columns;x++){
      const a=(y*(this.columns+1)+x)*3,b=a+(this.columns+1)*3,c=b+3,d=a+3;
      this.supportTriangle(a,b,d);this.supportTriangle(b,c,d);
    }
  }
  enforceBoundary(){return this.boundary?this.boundary.constrain(this.positions,this.previous):false;}
  grab(id, vertex, target) {
    this.returnPose=null;
    this.relaxing = false;
    const selected = [];
    const p = this.positions; const base = vertex * 3;
    for (let i = 0; i < this.count; i++) {
      const k = i * 3;
      const d = Math.hypot(p[k] - p[base], p[k+1] - p[base+1], p[k+2] - p[base+2]);
      if (d < .25) selected.push({ index:k, weight:Math.max(.12,1-d/.25), offset:[p[k]-p[base],p[k+1]-p[base+1],p[k+2]-p[base+2]] });
    }
    this.previous.set(this.positions);
    const start = Array.from(p.slice(base,base+3));
    this.grabs.set(id, { selected, vertex, target:[...start], start, origin:[...target], moved:false });
  }
  move(id, target) {
    const grab = this.grabs.get(id); if (!grab) return;
    const x=grab.start[0]+target[0]-grab.origin[0],y=grab.start[1]+target[1]-grab.origin[1];
    if(Math.abs(x-grab.target[0])+Math.abs(y-grab.target[1])>.0001)this.settleSteps=10;
    grab.target[0] = grab.start[0]+target[0]-grab.origin[0];
    grab.target[1] = grab.start[1]+target[1]-grab.origin[1];
    // Lift the sheet just enough to buckle. Never inflate the grabbed patch into a bubble.
    const travel = Math.hypot(target[0]-grab.origin[0],target[1]-grab.origin[1]);
    grab.moved ||= travel>.003;
    grab.target[2] = grab.start[2] + Math.min(.38,travel*.18);
    grab.pressure=0;
    if(this.boundary&&this.boundary.project(grab.target[0],grab.target[1])){
      const pressure=this.boundary.pressure,fold=Math.min(.24,pressure*.22);
      // The grabbed patch meets the wall; excess pulling presses it inward and lifts a fold.
      const nx=(this.boundary.x-grab.target[0])/pressure,ny=(this.boundary.y-grab.target[1])/pressure;
      grab.target[0]=this.boundary.x+nx*fold;grab.target[1]=this.boundary.y+ny*fold;
      grab.target[2]+=Math.min(.44,pressure*.36);grab.pressure=pressure;
    }
  }
  rememberPose() {
    this.settleSteps=0;
    this.pose.set(this.positions);
    this.previous.set(this.positions);
    // Preserve bent geometry as the material's new rest state. Structural lengths never yield.
    for (const j of this.bends) {
      const a=this.links[j]*3,b=this.links[j+1]*3,p=this.positions;
      const distance=Math.hypot(p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]);
      this.links[j+2]=Math.max(this.originalLinks[j+2]*.82,Math.min(this.originalLinks[j+2],distance));
    }
    this.relaxing = true;
    this.releaseDelay = this.environment==='sea'?.1:.65;
    if(this.surface){this.surfaceSettling=true;this.surfaceAge=0;}
  }
  release(id) {
    if (!this.grabs.delete(id)) return;
    if (!this.grabs.size) this.rememberPose();
  }
  releaseAll() { if(this.grabs.size){this.grabs.clear();this.rememberPose();} }
  reset() {
    this.returnPose=null;
    this.grabs.clear(); this.positions.set(this.rest); this.previous.set(this.rest);
    this.pose.set(this.rest); this.links.set(this.originalLinks);
    this.relaxing=false;this.releaseDelay=0;this.settleSteps=0;this.surfaceSettling=false;this.surfaceAge=0;
    this.enforceBoundary();
    if(this.surface){this.collide();this.supportFaces();this.previous.set(this.positions);this.pose.set(this.positions);}
  }
  get needsStep(){return this.surfaceSettling||(this.grabs.size?this.settleSteps>0:this.relaxing);}
  relax(seconds=1/60) {
    if(this.surfaceSettling)return this.step(seconds);
    if(!this.relaxing)return false;
    if(this.returnPose&&!this.reducedMotion){
      this.returnAge+=seconds;
      const t=this.returnAge,decay=.8,frequency=1.05;
      const spring=Math.exp(-decay*t)*(Math.cos(frequency*t)+decay/frequency*Math.sin(frequency*t));
      for(let i=0;i<this.positions.length;i++)this.positions[i]=this.rest[i]+(this.returnPose[i]-this.rest[i])*spring;
      const hop=.08*Math.exp(-.6*t)*Math.sin(2.2*t);
      for(let i=1;i<this.positions.length;i+=3)this.positions[i]+=hop;
      this.enforceBoundary();this.previous.set(this.positions);this.pose.set(this.positions);
      if(t>=10)this.reset();
      return true;
    }
    if(this.releaseDelay>0){
      const delay=Math.min(this.releaseDelay,seconds);this.releaseDelay-=delay;seconds-=delay;
      if(seconds<=0)return false;
    }
    // ~17 second half-life: a visible slow unfolding over roughly a minute, never a snap.
    const amount = 1-Math.exp(-seconds/(this.environment==='sea'?2.8:24));
    let error=0;
    for(let i=0;i<this.positions.length;i++){
      const delta=this.rest[i]-this.positions[i];error=Math.max(error,Math.abs(delta));
      this.positions[i]+=delta*amount;
      this.previous[i]=this.positions[i];this.pose[i]=this.positions[i];
    }
    for(const j of this.bends)this.links[j+2]+=(this.originalLinks[j+2]-this.links[j+2])*amount;
    this.enforceBoundary();this.collide();this.supportFaces();
    if(error<.0006)this.reset();
    return true;
  }
  step(seconds=1/60) {
    const falling=!!this.surface;
    if (!this.grabs.size&&!this.surfaceSettling) return this.relax(seconds);
    if (this.grabs.size&&!this.settleSteps&&!this.surfaceSettling) return false;
    if(this.settleSteps)this.settleSteps--;
    if(falling)this.surfaceAge+=seconds;
    let movement=0;
    const before=falling?this.positions.slice():null;
    this.time += 1 / 60;
    const p = this.positions, old = this.previous;
    this.pinned.fill(0);
    for (const grab of this.grabs.values()) this.pinned[grab.vertex]=1;
    for (let i = 0; i < this.count; i++) {
      const k = i*3;
      for (let axis = 0; axis < 3; axis++) {
        const j = k+axis, current = p[j];
        // High internal friction gives a dry, almost immediate response rather than elastic lag.
        p[j] += (current-old[j]) * .16 + (this.pose[j]-current)*.001;
        old[j] = current;
      }
      if(falling&&!this.pinned[i])p[k+2]-=.012*Math.min(2,seconds*60)**2;
    }
    const links = this.links;
    for (let pass = 0; pass < this.solverPasses; pass++) {
      // Alternating traversal prevents a preferred pulling direction.
      for (let cursor = 0; cursor < links.length; cursor += 4) {
        const j = pass % 2 ? links.length-4-cursor : cursor;
        const a = links[j]*3, b = links[j+1]*3;
        const dx = p[b]-p[a], dy = p[b+1]-p[a+1], dz = p[b+2]-p[a+2];
        const distance = Math.sqrt(dx*dx+dy*dy+dz*dz);
        if (distance < .00001) continue;
        const wa = 1-this.pinned[a/3], wb = 1-this.pinned[b/3];
        if (!wa && !wb) continue;
        const correction = (distance-links[j+2])/distance / (wa+wb) * links[j+3];
        const cx = dx*correction, cy = dy*correction, cz = dz*correction;
        p[a]+=cx*wa; p[a+1]+=cy*wa; p[a+2]+=cz*wa;
        p[b]-=cx*wb; p[b+1]-=cy*wb; p[b+2]-=cz*wb;
      }
      if(falling)this.collide();
      for (const grab of this.grabs.values()) for (const vertex of grab.selected) {
        const strength = vertex.weight * .85;
        for (let axis = 0; axis < 3; axis++) {
          const j = vertex.index+axis;
          p[j] += (grab.target[axis]+vertex.offset[axis]-p[j])*strength;
        }
      }
      this.enforceBoundary();
    }
    // Boundary contacts are solved with the links, so the mesh crumples rather than clipping.
    for (let k = 0; k < p.length; k+=3) {
      p[k+2] = Math.max(-1.5,Math.min(1.5,p[k+2]));
    }
    this.enforceBoundary();this.collide();this.supportFaces();
    if(falling){
      for(let i=0;i<p.length;i++)movement=Math.max(movement,Math.abs(p[i]-before[i]));
      if(!this.grabs.size&&this.surfaceAge>.8&&(movement<.0008||this.surfaceAge>3.95)){
        this.surfaceSettling=false;this.relaxing=true;this.previous.set(p);this.pose.set(p);
      }
    }
    return true;
  }
}
