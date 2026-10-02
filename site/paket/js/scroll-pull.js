// Scroll deformation is layered over a snapshot of the current (possibly hand-crumpled) sheet.
// The upper edge is pinned while the lower part folds upward. Reverse scroll is reversible.
export class ScrollPull {
  constructor(sheet){this.sheet=sheet;this.reset();}
  reset(){this.base=null;this.progress=0;this.pinOffset=0;this.applied=-1;}
  get active(){return this.base!==null;}
  get needsApply(){return this.active&&this.applied!==this.progress;}
  begin(scrollY,pixelsPerUnit){
    this.base=this.sheet.positions.slice();this.origin=scrollY;
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(let k=0;k<this.base.length;k+=3){minX=Math.min(minX,this.base[k]);maxX=Math.max(maxX,this.base[k]);minY=Math.min(minY,this.base[k+1]);maxY=Math.max(maxY,this.base[k+1]);}
    this.bounds={minX,maxX,minY,maxY};this.span=Math.max(.1,maxY-minY);this.center=(minX+maxX)/2;
    this.range=Math.max(160,Math.min(480,this.span*pixelsPerUnit*.85));this.applied=-1;
  }
  setScroll(scrollY,delta,pixelsPerUnit){
    if(!this.active){if(delta<=0)return false;this.begin(scrollY-delta,pixelsPerUnit);}
    // Once fully unfolded, following upward scrolling moves the next gesture's origin too.
    this.origin=Math.min(this.origin,scrollY);
    this.pinOffset=Math.max(0,Math.min(this.range,scrollY-this.origin));
    this.progress=this.pinOffset/this.range;
    return this.needsApply;
  }
  eased(){return this.progress*this.progress*(3-2*this.progress);}
  previewBounds(){
    const t=this.eased(),b=this.bounds,half=(b.maxX-b.minX)*(1-.42*t)/2;
    return {min:{x:this.center-half-.15*t,y:b.maxY-this.span*(1-.84*t)-.12*t},max:{x:this.center+half+.15*t,y:b.maxY}};
  }
  apply(){
    if(!this.needsApply)return false;
    const sheet=this.sheet,p=sheet.positions,b=this.base,t=this.eased();
    if(this.progress===0)p.set(b);
    else for(let k=0;k<p.length;k+=3){
      const u=((k/3)%(sheet.columns+1))/sheet.columns;
      const v=Math.max(0,Math.min(1,(this.bounds.maxY-b[k+1])/this.span));
      const envelope=Math.pow(Math.sin(Math.PI*v),.75);
      p[k]=this.center+(b[k]-this.center)*(1-.42*t)+t*.15*envelope*Math.sin(v*17+u*8);
      p[k+1]=Math.min(this.bounds.maxY,this.bounds.maxY-this.span*v*(1-.84*t)+t*.12*envelope*Math.sin(v*24+u*7));
      p[k+2]=b[k+2]+t*(.45*envelope*Math.sin(v*21+u*9)+.1*v*Math.sin(u*22));
    }
    sheet.previous.set(p);sheet.pose.set(p);sheet.relaxing=false;sheet.settleSteps=0;
    this.applied=this.progress;return true;
  }
  bake(pixelsPerUnit){
    if(!this.active)return false;
    this.apply();
    // Transfer the viewport pin into local coordinates before a manual grab takes over.
    for(let k=1;k<this.sheet.positions.length;k+=3)this.sheet.positions[k]-=this.pinOffset/pixelsPerUnit;
    this.sheet.rememberPose();this.reset();return true;
  }
}
