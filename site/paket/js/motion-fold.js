// Reversible gravity folds. Targets always come from rest, never the previous fold.
// Dragging and scroll deformation take priority in main.js.
export class MotionFold {
  constructor(sheet){this.sheet=sheet;this.gravity=null;}
  setGravity(gravity){this.gravity=gravity;}
  get active(){return !!this.gravity&&!this.sheet.reducedMotion;}
  apply(dt){
    const sheet=this.sheet;
    if(!this.active||sheet.grabs.size)return false;
    const {x,y}=this.gravity;
    const side=Math.abs(x),lift=Math.abs(y),blend=1-Math.exp(-Math.max(0,dt)*9);
    let changed=false;
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
      const targets=[tx,ty,tz];
      for(let axis=0;axis<3;axis++){
        const index=i+axis,delta=targets[axis]-sheet.positions[index];
        if(Math.abs(delta)>.00001){sheet.positions[index]+=delta*blend;changed=true;}
      }
    }
    if(changed){sheet.previous.set(sheet.positions);sheet.pose.set(sheet.positions);}
    return changed;
  }
}
