import * as THREE from './vendor/three.module.js';
import {screenMask} from './pendant-shapes.js?v=52';

// Fixed studio softboxes reflected by the moving screen, rather than a painted UV streak.
export function createScreenGlass(body){
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,toneMapped:false,
    uniforms:{windowMask:{value:screenMask('classic')}},
    vertexShader:`
      varying vec2 maskUv; varying vec3 worldPoint; varying vec3 worldNormal;
      void main(){
        maskUv=position.xy/4.+.5;
        vec4 world=modelMatrix*vec4(position,1.);
        worldPoint=world.xyz;
        worldNormal=normalize(mat3(modelMatrix)*vec3(0.,0.,1.));
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
    fragmentShader:`
      uniform sampler2D windowMask;
      varying vec2 maskUv; varying vec3 worldPoint; varying vec3 worldNormal;
      void main(){
        float mask=texture2D(windowMask,maskUv).a;
        if(mask<.02)discard;
        vec3 n=normalize(worldNormal),v=normalize(cameraPosition-worldPoint);
        if(dot(n,v)<=0.)discard;
        // Slightly curved cover gives the softbox a tapered edge across the screen.
        n=normalize(n+vec3((maskUv.x-.5)*.12,(maskUv.y-.5)*.12,0.));
        vec3 r=reflect(-v,n);
        float axis=r.x+r.y*.48;
        float mainPanel=(1.-smoothstep(.065,.095,abs(axis+.20)))*smoothstep(-.35,.6,r.y);
        float edgePanel=exp(-pow((axis-.42)/.026,2.))*.45;
        float fresnel=pow(1.-max(dot(n,v),0.),3.);
        float alpha=mask*min(.30,mainPanel*.22+edgePanel*.12+fresnel*.14);
        gl_FragColor=vec4(.92,.96,1.,alpha);
        #include <colorspace_fragment>
      }`
  });
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(4,4),material);
  glass.position.z=.115;glass.renderOrder=3;body.add(glass);
  return {setShape(id){material.uniforms.windowMask.value=screenMask(id);}};
}
