import * as THREE from './vendor/three.module.js';
import {screenMask} from './pendant-shapes.js?v=52';
// A dim warped room behind the head, masked to the glass opening.
export function createPendantDepth(body,character){
 const uniforms={mask:{value:screenMask('classic')},time:{value:0},gaze:{value:new THREE.Vector2()}};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms,
 vertexShader:`varying vec2 uvRoom;void main(){uvRoom=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec2 uvRoom;uniform sampler2D mask;uniform float time;uniform vec2 gaze;
 void main(){float alpha=texture2D(mask,uvRoom).a;if(alpha<.02)discard;
 vec2 p=(uvRoom-.5)*2.;p+=gaze*.022;
 float depth=dot(p,p);vec2 q=p*(1.+depth*.25);
 q+=vec2(sin(p.y*4.+time*.18),cos(p.x*3.-time*.15))*.055;
 vec2 grid=abs(fract(q*7.+.5)-.5);vec2 aa=fwidth(q*7.);
 float lines=1.-min(smoothstep(.016,.016+aa.x,grid.x),smoothstep(.016,.016+aa.y,grid.y));
 float vignette=1.-smoothstep(.45,1.35,length(p));
 vec3 base=mix(vec3(.0008,.0011,.0017),vec3(.0020,.0026,.0038),vignette);
 vec3 color=base+vec3(.11,.13,.15)*lines*(.45+.25*vignette);
 gl_FragColor=vec4(color,alpha);#include <colorspace_fragment>
 }`.replace(';#include',';\n#include')});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4,4),material);mesh.position.z=.05;mesh.renderOrder=1;body.add(mesh);
 return {setShape(id){uniforms.mask.value=screenMask(id);},update(time,reduced){uniforms.time.value=reduced?0:time;uniforms.gaze.value.copy(character.uniforms.look.value);}};
}
