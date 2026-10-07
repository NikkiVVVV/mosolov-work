import * as THREE from './vendor/three.module.js';
import {screenMask} from './pendant-shapes.js?v=52';
import {createIdleReactions,interruptIdle,stepIdle} from './idle-reactions.js?v=once29';
import {createCharacterState,stepCharacter} from './character-motion.js?v=55';
import {createRestState,wakeCharacter,stepRest} from './character-rest.js?v=150';

// Original approved portrait poses, with a deformable head region and short pose blends.
// This preserves the actual supplied face rather than rebuilding it from toy parts.
export class PendantCharacter {
  constructor(body,onReady,onError){
    this.state=createCharacterState();this.idleState=createIdleReactions();this.pointer={x:0,y:0};this.look={x:0,y:0};
    this.root=new THREE.Group();body.add(this.root);this.root.visible=false;
    this.loaded=0;this.textures=[];this.rest=createRestState();
    this.uniforms={windowMask:{value:screenMask('classic')},look:{value:new THREE.Vector2()},headTilt:{value:0},headShift:{value:new THREE.Vector2()},clock:{value:0},
      shakeMix:{value:0},sleepAmount:{value:0},glitch:{value:0},exasperation:{value:0},idleKind:{value:0},idleAmount:{value:0}};
    this.idleState.queue=['sip','cat'];
    const files=['gta-idle-v36.png','gta-idle-v36.png','gta-cup-v150.png','gta-sleep-v150.png','gta-cat-v150.png','gta-pull-v36.png'];this.totalTextures=files.length;
    const loader=new THREE.TextureLoader();
    Promise.all(files.map((name)=>loader.loadAsync(`assets/pendant/clay/${name}`).then(map=>{this.loaded++;return map;}))).then(maps=>{
      maps.forEach((map,i)=>{map.colorSpace=THREE.SRGBColorSpace;this.uniforms[`pose${i}`]={value:map};});
      this.textures=maps;
      this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:this.uniforms,
        vertexShader:`
          varying vec2 vUv; varying vec2 vWindow;
          uniform float idleAmount; uniform float idleKind;
          uniform vec2 look; uniform vec2 headShift; uniform float headTilt; uniform float clock; uniform float shakeMix;
          void main(){
            vUv=uv;
            vec3 p=position;
            // Blend deformation across the neck, keeping shoulders and hands anchored.
            float head=smoothstep(.55,.69,uv.y)*(1.-idleAmount);
            vec3 q=p-vec3(0.,.2,0.);
            float roll=headTilt-look.x*.045;
            float yaw=look.x*.14*(1.-shakeMix)-shakeMix*.08, pitch=-look.y*.09*(1.-shakeMix);
            q.xy=mat2(cos(roll),sin(roll),-sin(roll),cos(roll))*q.xy;
            q.xz=mat2(cos(yaw),sin(yaw),-sin(yaw),cos(yaw))*q.xz;
            q.yz=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*q.yz;
            p=mix(p,q+vec3(0.,.2,0.),head);
            p.y+=sin(clock*.9)*.006*head;
            p.xy+=headShift*head;
            // Keep the portrait in front of the lining; head rotation is a 2.5D warp.
            p.z=0.;
            p.xy*=.85;
            p.y+=.2;
            // Extend the shirt below the screen mask, including light-theme edges.
            p.y-=(1.-uv.y)*.18;

            vWindow=p.xy+vec2(0.,-.2);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
          }`,
        fragmentShader:`
          varying vec2 vUv; varying vec2 vWindow;
          uniform sampler2D windowMask;
          uniform sampler2D pose0; uniform sampler2D pose1; uniform sampler2D pose2; uniform sampler2D pose3;
          uniform sampler2D pose4; uniform sampler2D pose5;
          uniform vec2 look; uniform float exasperation;
          uniform float idleKind; uniform float idleAmount;
          uniform float shakeMix; uniform float sleepAmount; uniform float glitch; uniform float clock;
          vec4 premul(vec4 c){return vec4(c.rgb*c.a,c.a);}
          vec2 eyeUV(vec2 uv){
            float l=length((uv-vec2(.425,.565))/vec2(.035,.016));
            float r=length((uv-vec2(.602,.565))/vec2(.035,.016));
            float mask=1.-smoothstep(.55,1.,min(l,r));
            return uv-vec2(look.x*.009,-look.y*.005)*mask;
          }
          void main(){
            vec2 maskUV=vWindow/4.+.5;
            if(any(lessThan(maskUV,vec2(0.)))||any(greaterThan(maskUV,vec2(1.))))discard;
            float screenAlpha=texture2D(windowMask,maskUV).a;
            if(screenAlpha<.02)discard;
            vec2 sampleUv=vUv;
            float tick=floor(clock*12.);
            float band=floor(vUv.y*28.);
            float noise=fract(sin(band*73.1+tick*19.7)*43758.5453);
            sampleUv.x+=(noise-.5)*.016*glitch*step(.88,noise);
            vec2 gaze=eyeUV(sampleUv);
            // Shaking moves the original portrait; no second face and no dissolve.
            vec4 result=premul(texture2D(pose0,gaze));
            if(exasperation>.5&&shakeMix<.1)result=premul(texture2D(pose5,gaze));
            float eyePatch=max(1.-smoothstep(.75,1.,length((vUv-vec2(.425,.565))/vec2(.049,.03))),
                               1.-smoothstep(.75,1.,length((vUv-vec2(.602,.565))/vec2(.049,.03))));
            result=mix(result,premul(texture2D(pose3,sampleUv)),sleepAmount*eyePatch);
            if(idleKind>.5&&idleKind<1.5){
              // One rigid foreground sprite rises from below. The portrait is never crossfaded.
              vec2 cupUv=vUv+vec2(-.015,.30+(1.-idleAmount)*.85);
              if(all(greaterThanEqual(cupUv,vec2(0.)))&&all(lessThanEqual(cupUv,vec2(1.)))){
                vec4 cup=premul(texture2D(pose2,cupUv));
                result=cup+result*(1.-cup.a);
              }
            }
            if(idleKind>2.5){
              vec2 catUv=(vWindow-vec2(-.35,-2.4+idleAmount*1.35))/1.7+.5;
              if(all(greaterThanEqual(catUv,vec2(0.)))&&all(lessThanEqual(catUv,vec2(1.)))){
                vec4 cat=texture2D(pose4,catUv);
                cat.a*=smoothstep(.02,.1,cat.a)*smoothstep(0.,.015,min(min(catUv.x,catUv.y),min(1.-catUv.x,1.-catUv.y)));
                cat=premul(cat);
                result=cat+result*(1.-cat.a);
              }
            }
            if(result.a<.08)discard;
            result.rgb/=max(result.a,.001);
            result.rgb*=1.-glitch*.12*step(.94,noise);
            // Suppress the generator's saturated edge speckles at render time; sources stay intact.
            bool red=result.r>.5&&result.g<result.r*.19&&result.b<result.r*.25;
            bool yellow=result.r>.6&&result.g>result.r*.78&&result.b<result.r*.17;
            if(red||yellow)discard;
            result.a*=screenAlpha;
            gl_FragColor=result;
            #include <colorspace_fragment>
          }`
      });
      this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(3.1,3.1,48,48),this.material);
      this.mesh.position.set(0,-.2,.06);this.root.add(this.mesh);
      this.root.visible=true;onReady();
    }).catch(onError);
  }
  interruptIdle(){interruptIdle(this.idleState);wakeCharacter(this.rest);}
  update(dt,time,{swingSpeed=0,spinSpeed=0,stretch=0,busy=false,reduced}){
    const idle=stepIdle(this.idleState,dt,{reduced});
    const sleeping=stepRest(this.rest,dt,{active:busy||Math.abs(swingSpeed)>1.4||Math.abs(spinSpeed)>2,reduced});
    this.uniforms.sleepAmount.value=sleeping;
    this.uniforms.glitch.value=reduced?0:Math.min(.65,Math.max(0,(Math.abs(swingSpeed)+Math.abs(spinSpeed)*.5-3)/6));
    const exasperationTarget=Math.max(0,Math.min(1,(stretch-.6)/4));
    this.uniforms.exasperation.value=exasperationTarget>.12?1:0;
    this.uniforms.idleKind.value={none:0,sip:1,pucker:2,cat:3}[idle.kind];this.uniforms.idleAmount.value=idle.amount;
    const pose=stepCharacter(this.state,dt,{spinSpeed,swingSpeed,reduced});
    const ease=reduced?1:1-Math.exp(-7*dt);
    this.look.x+=(this.pointer.x-this.look.x)*ease;this.look.y+=(this.pointer.y-this.look.y)*ease;
    this.uniforms.look.value.set(reduced?0:this.look.x,reduced?0:this.look.y);
    this.uniforms.look.value.multiplyScalar(1-sleeping);
    const blend=reduced?1:1-Math.exp(-12*dt);
    this.uniforms.shakeMix.value+=(Number(pose.face==='shake')-this.uniforms.shakeMix.value)*blend;
    this.uniforms.look.value.multiplyScalar(1-this.uniforms.shakeMix.value);
    this.uniforms.idleAmount.value*=1-this.uniforms.shakeMix.value;
    this.uniforms.headTilt.value=-.035*this.uniforms.shakeMix.value+(reduced?0:Math.sin(time*1.1)*.018);
    this.uniforms.headShift.value.set(pose.headX,Math.abs(pose.headX)*.24-pose.impact*.025);
    this.uniforms.headTilt.value-=pose.headX*.7;
    this.uniforms.clock.value=reduced?0:time;
    return {...pose,face:sleeping>.8?'sleep':pose.face,exasperation:this.uniforms.exasperation.value,idleKind:idle.kind,idleAmount:idle.amount};
  }
}
