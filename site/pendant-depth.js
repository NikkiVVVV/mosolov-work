import * as THREE from './vendor/three.module.js';
import {screenMask} from './pendant-shapes.js?v=52';
// Perspective room: the same grid continues from rear wall onto floor and side walls.
export function createPendantDepth(body){
 const uniforms={mask:{value:screenMask('classic')}};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms,
 vertexShader:`varying vec2 uvRoom;void main(){uvRoom=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec2 uvRoom;uniform sampler2D mask;
 void main(){
 float alpha=texture2D(mask,uvRoom).a;if(alpha<.02)discard;
 vec2 p=(uvRoom-.5)*3.;vec3 ray=vec3(p,-1.8);
 float t=6./1.8;float side=0.;
 if(abs(ray.x)>.0001){float tx=1.8/abs(ray.x);if(tx<t){t=tx;side=1.;}}
 if(abs(ray.y)>.0001){float ty=1.8/abs(ray.y);if(ty<t){t=ty;side=2.;}}
 vec3 hit=vec3(0.,0.,3.)+ray*t;
 vec2 coords=side<.5?hit.xy:side<1.5?hit.zy:hit.xz;
 coords=coords/.55;
 vec2 edge=abs(fract(coords+.5)-.5),aa=fwidth(coords);
 float lines=1.-min(smoothstep(.012,.012+aa.x,edge.x),smoothstep(.012,.012+aa.y,edge.y));
 float distanceFade=clamp(1.-t*.09,.45,.85);
 float vignette=1.-smoothstep(.35,1.3,length(p));
 vec3 base=vec3(.0011,.0014,.0020)*(side<.5?1.:.72);
 vec3 color=base+vec3(.095,.105,.12)*lines*distanceFade*(.6+.4*vignette);
 gl_FragColor=vec4(color,alpha);
 #include <colorspace_fragment>
 }`});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4,4),material);mesh.position.z=.05;mesh.renderOrder=1;body.add(mesh);
 return {setShape(id){uniforms.mask.value=screenMask(id);},update(){}};
}
