import * as THREE from './vendor/three.module.js';
import {createIdleReactions,interruptIdle,stepIdle} from './idle-reactions.js?v=once29';
import {createCharacterState,reactCharacter,stepCharacter} from './character-motion.js?v=theme10';

// Original approved portrait poses, with a deformable head region and short pose blends.
// This preserves the actual supplied face rather than rebuilding it from toy parts.
export class PendantCharacter {
  constructor(body,onReady,onError){
    this.state=createCharacterState();this.idleState=createIdleReactions();this.pointer={x:0,y:0};this.look={x:0,y:0};
    this.root=new THREE.Group();body.add(this.root);this.root.visible=false;
    this.loaded=0;this.weights=[1,0,0,0];this.textures=[];
    this.uniforms={look:{value:new THREE.Vector2()},headTilt:{value:0},headShift:{value:new THREE.Vector2()},clock:{value:0},
      weights:{value:new THREE.Vector4(1,0,0,0)},gripping:{value:0},exasperation:{value:0},idleKind:{value:0},idleAmount:{value:0}};
    const files=['idle.webp','question.webp','shrug.webp','grip.webp','cup-layer-v2.png','pucker-v1.png','cat-user-v2.png','eyeroll-v1.png'];this.totalTextures=files.length;
    const loader=new THREE.TextureLoader();
    Promise.all(files.map((name)=>loader.loadAsync(`assets/pendant/clay/${name}`).then(map=>{this.loaded++;return map;}))).then(maps=>{
      maps.forEach((map,i)=>{map.colorSpace=THREE.SRGBColorSpace;this.uniforms[`pose${i}`]={value:map};});
      this.textures=maps;
      this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:this.uniforms,
        vertexShader:`
          varying vec2 vUv; varying vec2 vWindow;
          uniform float idleAmount; uniform float idleKind;
          uniform vec2 look; uniform vec2 headShift; uniform float headTilt; uniform float clock;
          void main(){
            vUv=uv;
            vec3 p=position;
            // Fit open palms and gripping fingers inside the window without scaling the face.
            float outer=smoothstep(.6,1.1,abs(p.x));
            p.x=mix(p.x,sign(p.x)*(.6+(abs(p.x)-.6)*.69),outer);
            // Blend deformation across the neck, keeping shoulders and hands anchored.
            float head=smoothstep(.55,.69,uv.y)*(1.-idleAmount);
            vec3 q=p-vec3(0.,.2,0.);
            float roll=headTilt-look.x*.045;
            float yaw=look.x*.14, pitch=-look.y*.09;
            q.xy=mat2(cos(roll),sin(roll),-sin(roll),cos(roll))*q.xy;
            q.xz=mat2(cos(yaw),sin(yaw),-sin(yaw),cos(yaw))*q.xz;
            q.yz=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*q.yz;
            p=mix(p,q+vec3(0.,.2,0.),head);
            p.y+=sin(clock*.9)*.006*head;
            p.xy+=headShift*head;
            // Keep the portrait in front of the lining; head rotation is a 2.5D warp.
            p.z=0.;
            p.xy*=1.85;
            p.y-=1.34;

            vWindow=p.xy+vec2(0.,-.2);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
          }`,
        fragmentShader:`
          varying vec2 vUv; varying vec2 vWindow;
          uniform sampler2D pose0; uniform sampler2D pose1; uniform sampler2D pose2; uniform sampler2D pose3;
          uniform sampler2D pose4; uniform sampler2D pose5; uniform sampler2D pose6; uniform sampler2D pose7;
          uniform vec2 look; uniform float exasperation;
          uniform float idleKind; uniform float idleAmount;
          uniform vec4 weights; uniform float gripping;
          vec4 premul(vec4 c){return vec4(c.rgb*c.a,c.a);}
          vec2 eyeUV(vec2 uv){
            float l=length((uv-vec2(.445,.797))/vec2(.022,.012));
            float r=length((uv-vec2(.532,.801))/vec2(.022,.012));
            float mask=1.-smoothstep(.55,1.,min(l,r));
            return uv-vec2(look.x*.006,-look.y*.004)*mask;
          }
          void main(){
            vec2 q=abs(vWindow)-vec2(1.315,1.395)+.74;
            float edge=length(max(q,0.))+min(max(q.x,q.y),0.)-.74;
            if(edge>0.)discard;
            vec2 gaze=eyeUV(vUv);
            vec4 a=texture2D(pose0,gaze),b=texture2D(pose1,gaze),c=texture2D(pose2,gaze),d=texture2D(pose3,gaze);
            // The raised-hands pose uses the questioning face from the matched portrait.
            d=mix(d,b,smoothstep(.62,.66,vUv.y)*gripping);
            vec4 result=premul(a)*weights.x+premul(b)*weights.y+premul(c)*weights.z+premul(d)*weights.w;
            result=mix(result,premul(texture2D(pose7,vUv)),exasperation*smoothstep(.58,.65,vUv.y));
            if(idleKind>.5&&idleKind<1.5){
              // One rigid foreground sprite rises from below. The portrait is never crossfaded.
              vec2 cupUv=vUv+vec2(.027,(1.-idleAmount)*.5);
              if(all(greaterThanEqual(cupUv,vec2(0.)))&&all(lessThanEqual(cupUv,vec2(1.)))){
                vec4 cup=premul(texture2D(pose4,cupUv));
                result=cup+result*(1.-cup.a);
              }
            }
            if(idleKind>1.5&&idleKind<2.5)result=mix(result,premul(texture2D(pose5,vUv)),idleAmount*(1.-exasperation));
            if(idleKind>2.5){
              vec2 catUv=(vWindow-vec2(-.35,-2.4+idleAmount*1.35))/1.7+.5;
              if(all(greaterThanEqual(catUv,vec2(0.)))&&all(lessThanEqual(catUv,vec2(1.)))){
                vec4 cat=texture2D(pose6,catUv);
                cat.a*=smoothstep(.02,.1,cat.a)*smoothstep(0.,.015,min(min(catUv.x,catUv.y),min(1.-catUv.x,1.-catUv.y)));
                cat=premul(cat);
                result=cat+result*(1.-cat.a);
              }
            }
            if(result.a<.08)discard;
            result.rgb/=max(result.a,.001);
            // Suppress the generator's saturated edge speckles at render time; sources stay intact.
            bool red=result.r>.5&&result.g<result.r*.19&&result.b<result.r*.25;
            bool yellow=result.r>.6&&result.g>result.r*.78&&result.b<result.r*.17;
            if(red||yellow)discard;
            gl_FragColor=result;
            #include <colorspace_fragment>
          }`
      });
      this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(3.1,3.1,48,48),this.material);
      this.mesh.position.set(0,-.2,.06);this.root.add(this.mesh);
      this.root.visible=true;onReady();
    }).catch(onError);
  }
  interruptIdle(){interruptIdle(this.idleState);}
  react(){reactCharacter(this.state);}
  update(dt,time,{swingSpeed=0,spinSpeed=0,stretch=0,busy=false,reduced}){
    const idle=stepIdle(this.idleState,dt,{reduced});
    const exasperationTarget=Math.max(0,Math.min(1,(stretch-.6)/4));
    this.uniforms.exasperation.value+=(exasperationTarget-this.uniforms.exasperation.value)*(1-Math.exp(-10*dt));
    this.uniforms.idleKind.value={none:0,sip:1,pucker:2,cat:3}[idle.kind];this.uniforms.idleAmount.value=idle.amount;
    const pose=stepCharacter(this.state,dt,{spinSpeed,swingSpeed,reduced});
    const ease=reduced?1:1-Math.exp(-7*dt);
    this.look.x+=(this.pointer.x-this.look.x)*ease;this.look.y+=(this.pointer.y-this.look.y)*ease;
    this.uniforms.look.value.set(reduced?0:this.look.x,reduced?0:this.look.y);
    this.uniforms.headTilt.value=(pose.face==='question'?-.045:pose.face==='shrug'?.035:0)+(reduced?0:Math.sin(time*1.1)*.018);
    this.uniforms.headShift.value.set(pose.headX,Math.abs(pose.headX)*.24-pose.impact*.025);
    this.uniforms.headTilt.value-=pose.headX*.7;
    this.uniforms.clock.value=reduced?0:time;
    const target=this.state.gripHold>0?3:pose.face==='question'?1:pose.face==='shrug'?2:0;
    const blend=reduced?1:1-Math.exp(-18*dt);
    this.weights.forEach((w,i)=>this.weights[i]=w+(Number(i===target)-w)*blend);
    this.uniforms.weights.value.set(...this.weights);this.uniforms.gripping.value=pose.grip;
    return {...pose,exasperation:this.uniforms.exasperation.value,idleKind:idle.kind,idleAmount:idle.amount};
  }
}
