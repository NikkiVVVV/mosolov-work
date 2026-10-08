import * as THREE from './vendor/three.module.js';
import {screenMask} from './pendant-shapes.js?v=52';
import {createIdleReactions,interruptIdle,stepIdle} from './idle-reactions.js?v=once29';
import {createCharacterState,stepCharacter} from './character-motion.js?v=55';
import {createRestState,wakeCharacter,stepRest} from './character-rest.js?v=150';

// Frontal floating portrait atlas; expression changes never change face proportions.
export class PendantCharacter {
 constructor(body,onReady,onError){
  this.state=createCharacterState();this.idleState=createIdleReactions();this.pointer={x:0,y:0};this.look={x:0,y:0};
  this.previewPose=new URL(location.href).searchParams.get("portrait-state");
  this.rest=createRestState();this.loaded=0;this.totalTextures=1;this.textures=[];
  this.root=new THREE.Group();body.add(this.root);this.root.visible=false;
  this.uniforms={windowMask:{value:screenMask('classic')},look:{value:new THREE.Vector2()},headTilt:{value:0},headShift:{value:new THREE.Vector2()},clock:{value:0},shakeMix:{value:0},sleepAmount:{value:0},glitch:{value:0},exasperation:{value:0},idleKind:{value:0},idleAmount:{value:0}};
  new THREE.TextureLoader().loadAsync('assets/pendant/float/faces-v201.png').then(map=>{
   map.colorSpace=THREE.SRGBColorSpace;this.textures=[map];this.loaded=1;this.uniforms.atlas={value:map};
   this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false,uniforms:this.uniforms,
    vertexShader:`
     varying vec2 vUv;varying vec2 vWindow;
     uniform vec2 look;uniform vec2 headShift;uniform float headTilt;uniform float clock;
     void main(){
      vUv=uv;vec3 p=position;
      float roll=headTilt-look.x*.025;
      p.xy=mat2(cos(roll),sin(roll),-sin(roll),cos(roll))*p.xy;
      float yaw=look.x*.16,pitch=-look.y*.10;
      p.xz=mat2(cos(yaw),sin(yaw),-sin(yaw),cos(yaw))*p.xz;
      p.yz=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*p.yz;
      p.xy+=headShift+vec2(look.x*.018,.24+sin(clock*.8)*.012);
      vWindow=p.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
     }`,
    fragmentShader:`
     varying vec2 vUv;varying vec2 vWindow;
     uniform sampler2D atlas;uniform sampler2D windowMask;
     uniform vec2 look;uniform float shakeMix;uniform float exasperation;uniform float sleepAmount;
     vec4 face(vec2 uv,float cell){return texture2D(atlas,vec2((clamp(uv.x,.002,.998)+cell)/4.,clamp(uv.y,.002,.998)));}
     vec4 premul(vec4 c){return vec4(c.rgb*c.a,c.a);}
     void main(){
      float mask=texture2D(windowMask,vWindow/4.+.5).a;if(mask<.02)discard;
      vec2 uv=vUv;
      float a=length((uv-vec2(.328,.525))/vec2(.032,.022));
      float b=length((uv-vec2(.648,.525))/vec2(.032,.022));
      float eyes=1.-smoothstep(.65,1.,min(a,b));
      uv-=eyes*vec2(look.x*.014,-look.y*.009)*(1.-sleepAmount);
      vec4 c=mix(premul(face(uv,0.)),premul(face(uv,1.)),shakeMix);
      c=mix(c,premul(face(uv,2.)),exasperation);
      c=mix(c,premul(face(vUv,3.)),sleepAmount*(1.-exasperation));
      if(c.a<.12)discard;c.rgb/=max(c.a,.001);
      bool red=c.r>.5&&c.g<c.r*.23&&c.b<c.r*.30;
      bool yellow=c.r>.6&&c.g>c.r*.78&&c.b<c.r*.17;
      if(red||yellow)discard;
      gl_FragColor=vec4(c.rgb,c.a*mask);
      #include <colorspace_fragment>
     }`
   });
   const aspect=map.image.width/4/map.image.height;
   this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6/aspect,40,40),this.material);
   this.mesh.position.z=.075;this.mesh.renderOrder=2;this.root.add(this.mesh);
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
    if(this.previewPose){
      this.uniforms.shakeMix.value=Number(this.previewPose==='sway');
      this.uniforms.exasperation.value=Number(this.previewPose==='pull');
      this.uniforms.sleepAmount.value=Number(this.previewPose==='sleep');
    }
    return {...pose,face:this.uniforms.exasperation.value>.5?'pull':sleeping>.8?'sleep':pose.face,exasperation:this.uniforms.exasperation.value,idleKind:idle.kind,idleAmount:idle.amount};
  }
}
