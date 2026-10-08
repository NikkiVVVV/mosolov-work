import * as THREE from './vendor/three.module.js';
import {screenMask} from './pendant-shapes.js?v=52';
// One quiet perspective grid, fading into the distance.
export function createPendantDepth(body){
 const uniforms={mask:{value:screenMask('classic')}};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms,
 vertexShader:`varying vec2 uvRoom;void main(){uvRoom=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec2 uvRoom;uniform sampler2D mask;
 void main(){
 float alpha=texture2D(mask,uvRoom).a;if(alpha<.02)discard;
 // A single sparse floor fades before its vanishing point.
 vec2 p=(uvRoom-.5)*3.;
 float distanceToHorizon=-p.y+.16;
 float visible=smoothstep(.08,.34,distanceToHorizon);
 float depth=1./max(distanceToHorizon,.08);
 vec2 coords=vec2(p.x*depth,depth)*1.35;
 vec2 edge=abs(fract(coords+.5)-.5),aa=fwidth(coords);
 float lines=1.-min(smoothstep(.012,.012+aa.x,edge.x),smoothstep(.012,.012+aa.y,edge.y));
 float fade=visible*(1.-smoothstep(3.,7.,depth));
 vec3 color=vec3(.0011,.0014,.0020)+vec3(.065,.072,.08)*lines*fade;
 gl_FragColor=vec4(color,alpha);
 #include <colorspace_fragment>
 }`});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4,4),material);mesh.position.z=.05;mesh.renderOrder=1;body.add(mesh);
 return {setShape(id){uniforms.mask.value=screenMask(id);},update(){}};
}
