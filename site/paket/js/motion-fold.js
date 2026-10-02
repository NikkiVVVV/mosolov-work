// Reversible gravity folds. Targets always come from rest, never the previous fold.
// Dragging and scroll deformation take priority in main.js.
export class MotionFold {
  constructor(sheet){this.sheet=sheet;this.gravity=null;this.offset=new Float32Array(sheet.positions.length);this.moving=false;}
  setGravity(gravity){this.gravity=gravity;if(!gravity&&this.offset.some(value=>Math.abs(value)>.00001))this.moving=true;}
  get active(){return (!!this.gravity||this.moving)&&!this.sheet.reducedMotion;}
  bake(){
    // Keep the displayed pose when another scene or scroll takes ownership.
    if(this.offset.some(value=>Math.abs(value)>.00001))this.sheet.rememberPose();
    this.offset.fill(0);this.moving=false;
  }
  apply(dt){
    const sheet=this.sheet;
    if(!this.active||sheet.grabs.size)return false;
    // Remove only the previous sensor layer. Manual folds continue their own slow relaxation.
    for(let i=0;i<sheet.positions.length;i++)sheet.positions[i]-=this.offset[i];
    const relaxed=sheet.relax(dt);
    const {x,y}=this.gravity||{x:0,y:0};
    const side=Math.abs(x),lift=Math.abs(y),blend=1-Math.exp(-Math.max(0,dt)*9);
    let changed=relaxed;this.moving=false;
    for(let i=0;i<sheet.positions.length;i+=3){
      const rx=sheet.rest[i],ry=sheet.rest[i+1],rz=sheet.rest[i+2];
      // Tilting left folds the right edge inward; upright folds the bottom upward.
      const u=rx/sheet.width+.5,v=.5-ry/sheet.height;
      const edge=x<0?u:1-u,lower=y>=0?v:1-v;
      const sideFold=side*edge*edge,verticalFold=lift*lower*lower;
      const tx=rx+Math.sign(x)*sheet.width*.30*sideFold;
      const ty=ry+Math.sign(y)*sheet.height*.32*verticalFold;
      const tz=rz-.40*verticalFold-.25*sideFold
        +.14*side*Math.sin(edge*Math.PI*3)*edge
        +.18*lift*Math.sin(lower*Math.PI*4)*lower;
      const targets=[tx-rx,ty-ry,tz-rz];
      for(let axis=0;axis<3;axis++){
        const index=i+axis,delta=targets[axis]-this.offset[index];
        if(Math.abs(delta)>.00001){this.offset[index]+=delta*blend;changed=true;this.moving=true;}
        else this.offset[index]=targets[axis];
        sheet.positions[index]+=this.offset[index];
      }
    }
    if(changed){sheet.previous.set(sheet.positions);sheet.pose.set(sheet.positions);}
    return changed;
  }
}
