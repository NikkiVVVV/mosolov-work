import * as THREE from './vendor/three.module.js';
import { createRope, stepRope } from './pendant-motion.js?v=gravity5';

export class BraidedCord {
  constructor(scene,body,material,{compact=false}={}){
    this.body=body;this.attachmentOffset=0;this.anchor=[0,3.6,0];this.endpoint=new THREE.Vector3();
    body.updateWorldMatrix(true,false);body.localToWorld(this.endpoint.set(0,2.12+this.attachmentOffset,-.08));
    this.rope=createRope(this.anchor,this.endpoint.toArray());
    this.points=[new THREE.Vector3(0,6,0),new THREE.Vector3(0,4.5,0),...this.rope.nodes.map(n=>new THREE.Vector3(...n.p))];
    this.curve=new THREE.CatmullRomCurve3(this.points,false,'centripetal');
    this.steps=compact?64:96;this.strands=4;
    this.samples=Array.from({length:this.steps+1},()=>({centre:new THREE.Vector3(),normal:new THREE.Vector3(),binormal:new THREE.Vector3()}));
    this.mesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.029,.029,1,compact?5:7),material,this.steps*this.strands);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.frustumCulled=false;scene.add(this.mesh);
    this.a=new THREE.Vector3();this.b=new THREE.Vector3();this.centre=new THREE.Vector3();
    this.tangent=new THREE.Vector3();this.normal=new THREE.Vector3();this.binormal=new THREE.Vector3();
    this.up=new THREE.Vector3(0,1,0);this.forward=new THREE.Vector3(0,0,1);this.transform=new THREE.Object3D();
    // Compact stopper knot and a short tail through the attachment eye.
    this.knot=new THREE.Mesh(new THREE.TorusKnotGeometry(.125,.053,80,8,2,3),material);
    this.knot.position.set(0,1.98,-.08);this.knot.scale.set(1,1.12,.85);this.knot.rotation.z=.5;body.add(this.knot);
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(.039,.039,.3,10),material);
    tail.position.set(0,1.73,-.08);body.add(tail);this.tail=tail;
    this.update(0,false,0,true);
  }
  point(index,strand,twist,out){
    const t=index/this.steps,{centre,normal,binormal}=this.samples[index];
    const direction=strand<2?1:-1;
    const phase=t*Math.PI*2*19*direction+strand*Math.PI/2+twist*t*t;
    const r=.052+.005*Math.sin(t*Math.PI*2*38+strand*Math.PI);
    return out.copy(centre).addScaledVector(normal,Math.cos(phase)*r).addScaledVector(binormal,Math.sin(phase)*r);
  }
  update(dt,held,twist,snap=false,arrival=0){
    this.anchor[1]=3.6+arrival;this.points[0].y=6+arrival;this.points[1].y=4.5+arrival;
    this.body.localToWorld(this.endpoint.set(0,2.12+this.attachmentOffset,-.08));
    const end=this.endpoint.toArray();
    if(snap){
      this.rope=createRope(this.anchor,end);this.rope.length=1.582;
    }else stepRope(this.rope,dt,this.anchor,end,held);
    this.rope.nodes.forEach((n,i)=>this.points[i+2].set(...n.p));
    // All four strands share the same curve frame. Sample it once, not twice per segment/strand.
    for(let i=0;i<=this.steps;i++){
      const sample=this.samples[i],t=i/this.steps;
      this.curve.getPoint(t,sample.centre);this.curve.getTangent(t,this.tangent).normalize();
      sample.normal.crossVectors(this.tangent,this.forward).normalize();
      sample.binormal.crossVectors(this.tangent,sample.normal).normalize();
    }
    for(let strand=0;strand<this.strands;strand++)for(let i=0;i<this.steps;i++){
      this.point(i,strand,twist,this.a);this.point(i+1,strand,twist,this.b);
      this.transform.position.copy(this.a).add(this.b).multiplyScalar(.5);
      this.tangent.subVectors(this.b,this.a);this.transform.scale.set(1,this.tangent.length()+.006,1);
      this.transform.quaternion.setFromUnitVectors(this.up,this.tangent.normalize());this.transform.updateMatrix();
      this.mesh.setMatrixAt(strand*this.steps+i,this.transform.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate=true;
    return this.rope.speed;
  }
}
