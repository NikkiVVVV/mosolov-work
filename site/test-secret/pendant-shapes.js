import * as THREE from './vendor/three.module.js';

export const shapes=[
  {id:'classic',ru:'Классика',en:'Classic',icon:'<rect x="4" y="3" width="16" height="18" rx="5"/>'},
  {id:'round',ru:'Круг',en:'Circle',icon:'<circle cx="12" cy="12" r="9"/>'},
  {id:'star',ru:'Звезда',en:'Star',icon:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>'},
];
export function outline(w,h,r){
  const p=new THREE.Shape(),x=-w/2,y=-h/2;
  p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);
  p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);
  p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);return p;
}
export function solid(shape,depth,bevel,curveSegments=20){
  return new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,steps:1,curveSegments});
}
function shell(id){
  if(id==='round'){const p=new THREE.Shape();p.absarc(0,0,1.5,0,Math.PI*2,false);return p;}
  if(id!=='star')return outline(2.88,3.04,.85);
  const p=new THREE.Shape(),points=Array.from({length:10},(_,i)=>{
    const a=Math.PI/2+i*Math.PI/5,r=i%2?1.17:1.78;
    return new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r);
  });
  for(let i=0;i<10;i++){
    const v=points[i],prev=points[(i+9)%10],next=points[(i+1)%10];
    const entry=v.clone().lerp(prev,.14),exit=v.clone().lerp(next,.14);
    if(i===0)p.moveTo(entry.x,entry.y);else p.lineTo(entry.x,entry.y);
    p.quadraticCurveTo(v.x,v.y,exit.x,exit.y);
  }
  p.closePath();return p;
}
export function screenOutline(id){
  if(id==='round'){
    const p=new THREE.Shape();p.absarc(0,0,1.29,0,Math.PI*2,false);return p;
  }
  if(id==='star')return new THREE.Shape(shell('star').getPoints(12).map(p=>p.multiplyScalar(.82)));
  return outline(2.58,2.75,.74);
}
// One cached mask per shape, shared by all character poses and reactions.
const maskCache=new Map();
export function screenMask(id){
  if(maskCache.has(id))return maskCache.get(id);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const context=canvas.getContext('2d'),points=screenOutline(id).getPoints(24);
  context.fillStyle='#fff';context.beginPath();
  points.forEach((p,i)=>{const x=(p.x/4+.5)*512,y=(.5-p.y/4)*512;i?context.lineTo(x,y):context.moveTo(x,y);});
  context.closePath();context.fill();
  const mask=new THREE.CanvasTexture(canvas);mask.anisotropy=2;
  maskCache.set(id,mask);return mask;
}
// Three bounded, lazily-built geometries. Switching never adds another device.
const cache=new Map();
export function caseGeometry(id){
  if(!shapes.some(s=>s.id===id))id='classic';
  if(cache.has(id))return cache.get(id);
  const scale=id==='round'?.79:id==='star'?.66:1;
  const rim=id==='classic'?outline(2.87,3.03,.84):shell(id);
  const hole=screenOutline(id);
  rim.holes.push(new THREE.Path(hole.getPoints(48).reverse()));
  const result={back:solid(shell(id),.32,.1,id==='star'?8:20),bezel:solid(rim,.22,.035,id==='star'?8:20),lining:new THREE.ShapeGeometry(hole,24),screenScale:scale,eyeY:id==='star'?1.8:id==='round'?1.65:1.64};
  cache.set(id,result);return result;
}
