const clamp=value=>Math.max(0,Math.min(1,value));
const ease=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};

// Three physical half-folds, opened in reverse order. No constraint solver is needed.
export class FoldIntro {
  constructor(sheet,enabled=true){
    this.sheet=sheet;this.active=enabled;this.time=0;this.phase='folded';this.duration=2.2;
    if(enabled)this.sample(0);
  }
  sample(seconds){
    if(!this.active)return false;
    this.time=seconds;
    if(seconds>=this.duration){this.finish();return true;}
    const open3=ease((seconds-.18)/.58),open2=ease((seconds-.84)/.59),open1=ease((seconds-1.50)/.65);
    this.phase=seconds<.18?'folded':seconds<.84?'unfold-1':seconds<1.5?'unfold-2':'unfold-3';
    const a=(Math.PI-.055)*(1-open1),b=(Math.PI-.045)*(1-open2),c=(Math.PI-.065)*(1-open3);
    const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cc=Math.cos(c),sc=Math.sin(c);
    const {rest,positions:p,height}=this.sheet,pivot=height/4;
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(let k=0;k<p.length;k+=3){
      let x=rest[k],y=rest[k+1],z=rest[k+2],old;
      // Right half onto the left; lower half onto the upper; upper quarter down.
      if(x>0){old=x;x=x*ca+z*sa;z=-old*sa+z*ca-.022*(1-open1);}
      if(y<0){old=y;y=y*cb-z*sb;z=old*sb+z*cb-.026*(1-open2);}
      if(y>pivot){old=y-pivot;y=pivot+old*cc-z*sc;z=old*sc+z*cc+.03*(1-open3);}
      p[k]=x;p[k+1]=y;p[k+2]=z;
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
    // Keep the folded parcel centred in the same place as the unfolded hero.
    const xCenter=(maxX+minX)/2,yCenter=(maxY+minY)/2;
    for(let k=0;k<p.length;k+=3){p[k]-=xCenter;p[k+1]-=yCenter;}
    return true;
  }
  advance(delta){return this.sample(this.time+delta);}
  finish(){this.active=false;this.phase='complete';this.sheet.reset();}
}
