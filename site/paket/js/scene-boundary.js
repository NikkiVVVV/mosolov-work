// The visible scene and the solver share one rounded rectangular enclosure.
export const EDGE_RISE=0;
export const EDGE_SLOPE=0;
export class SceneBoundary {
  constructor(){this.configure(4.48,.65,0,0,0);}
  configure(height,extension,offsetX,offsetY,angle,bottomExtension=0,radius=.24,topRadius=radius,width=4){
    this.left=-width/2;this.right=width/2;this.top=height/2+extension;
    this.bottom=-height/2-bottomExtension+EDGE_RISE;this.slope=EDGE_SLOPE;
    this.offsetX=offsetX;this.offsetY=offsetY;this.cos=Math.cos(angle);this.sin=Math.sin(angle);
    // Clearance for the two skins and small water displacement in the vertex shader.
    this.margin=.05;
    this.radius=Math.min(radius,(this.right-this.left)/2,(this.top-this.bottom)/2);
    this.topRadius=Math.min(topRadius,(this.right-this.left)/2,(this.top-this.bottom)/2);
  }
  project(x,y){
    const wx=x*this.cos-y*this.sin+this.offsetX,wy=x*this.sin+y*this.cos+this.offsetY;
    const left=this.left+this.margin,right=this.right-this.margin,bottom=this.bottom+this.margin,top=this.top-this.margin;
    let bx=Math.max(left,Math.min(right,wx)),by=Math.max(bottom,Math.min(top,wy));
    const upper=by>(top+bottom)/2;
    const r=Math.max(0,(upper?this.topRadius:this.radius)-this.margin);
    if(r>0){
      const cx=Math.max(left+r,Math.min(right-r,bx)),cy=upper?Math.min(top-r,by):Math.max(bottom+r,by);
      const dx=bx-cx,dy=by-cy,distance=Math.hypot(dx,dy);
      if(distance>r){bx=cx+dx*r/distance;by=cy+dy*r/distance;}
    }
    const dx=bx-this.offsetX,dy=by-this.offsetY;
    this.x=dx*this.cos+dy*this.sin;this.y=-dx*this.sin+dy*this.cos;
    this.pressure=Math.hypot(bx-wx,by-wy);
    return this.pressure>1e-7;
  }
  constrain(positions,previous){
    let changed=false;
    for(let k=0;k<positions.length;k+=3){
      if(this.project(positions[k],positions[k+1])){
        positions[k]=this.x;positions[k+1]=this.y;
        if(previous){previous[k]=this.x;previous[k+1]=this.y;}
        changed=true;
      }
    }
    return changed;
  }
}
