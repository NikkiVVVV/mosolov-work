import * as THREE from './vendor/three.module.js';

export function convexHull(points){
  const sorted=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y);
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const lower=[],upper=[];
  for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(const p of sorted.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  return lower.slice(0,-1).concat(upper.slice(0,-1));
}

export class PendantOverlay {
  constructor(renderer){
    this.layer=document.createElement('div');this.layer.className='pendant-overlay';
    this.hit=document.createElement('button');this.hit.type='button';this.hit.className='pendant-interaction';
    this.hit.setAttribute('aria-label','Подвеска');this.hit.setAttribute('aria-keyshortcuts','Enter Space ArrowLeft ArrowRight ArrowUp ArrowDown R');
    renderer.domElement.setAttribute('aria-hidden','true');
    this.layer.append(renderer.domElement,this.hit);document.body.append(this.layer);
    this.corners=[];
    for(const x of [-1.53,1.53])for(const y of [-1.64,1.64])for(const z of [-.5,.29])this.corners.push(new THREE.Vector3(x,y,z));
    this.projected=this.corners.map(()=>new THREE.Vector3());
  }
  update(body,camera){
    const width=innerWidth,height=innerHeight;
    const points=this.corners.map((corner,i)=>{
      const p=this.projected[i].copy(corner);body.localToWorld(p);p.project(camera);
      return {x:(p.x*.5+.5)*width,y:(.5-p.y*.5)*height};
    });
    const hull=convexHull(points),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const left=Math.min(...xs),top=Math.min(...ys),w=Math.max(...xs)-left,h=Math.max(...ys)-top;
    Object.assign(this.hit.style,{left:`${left}px`,top:`${top}px`,width:`${w}px`,height:`${h}px`,clipPath:`polygon(${hull.map(p=>`${p.x-left}px ${p.y-top}px`).join(',')})`});
    this.hit.dataset.screenX=(left+w/2).toFixed(1);this.hit.dataset.screenY=(top+h/2).toFixed(1);
  }
  attach(parent=document.body){parent.append(this.layer);}
}
