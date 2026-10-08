import * as THREE from './vendor/three.module.js';
import {screenMask} from './pendant-shapes.js?v=52';
import {createIdleReactions,interruptIdle,stepIdle} from './idle-reactions.js?v=once29';
import {createCharacterState,stepCharacter} from './character-motion.js?v=55';
import {createRestState,wakeCharacter,stepRest} from './character-rest.js?v=150';

// Frontal floating portrait atlas; expression changes never change face proportions.
export class PendantCharacter {
 constructor(body,onReady,onError){
  this.state=createCharacterState();this.idleState=createIdleReactions();this.idleState.queue=['cat'];this.pointer={x:0,y:0};this.look={x:0,y:0};
  this.previewPose=new URL(location.href).searchParams.get("portrait-state");
  this.desktopEyes=matchMedia('(hover: hover) and (pointer: fine) and (min-width: 641px)');this.flight={x:0,y:0,vx:0,vy:0,angle:0,spin:0,wild:false,direction:1};
  this.rest=createRestState();this.loaded=0;this.totalTextures=3;this.textures=[];
  this.root=new THREE.Group();body.add(this.root);this.root.visible=false;
  this.uniforms={windowMask:{value:screenMask('classic')},look:{value:new THREE.Vector2()},headTilt:{value:0},headShift:{value:new THREE.Vector2()},clock:{value:0},pixelLift:{value:0},shakeMix:{value:0},sleepAmount:{value:0},glitch:{value:0},exasperation:{value:0},idleKind:{value:0},idleAmount:{value:0}};
  const loader=new THREE.TextureLoader();
  Promise.all(['faces-v206.png','cat-v206.png','book-v206.png'].map(file=>loader.loadAsync('assets/pendant/float/'+file))).then(([map,cat,book])=>{
   map.colorSpace=THREE.SRGBColorSpace;this.textures=[map,cat,book];this.loaded=3;this.uniforms.atlas={value:map};
   this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false,uniforms:this.uniforms,
    vertexShader:`
     varying vec2 vUv;varying vec2 vWindow;
     uniform vec2 look;uniform vec2 headShift;uniform float headTilt;uniform float clock;uniform float pixelLift;
     void main(){
      vUv=uv;vec3 p=position;float c=cos(headTilt),s=sin(headTilt);p.xy=mat2(c,-s,s,c)*p.xy;p.xy+=headShift;
      vWindow=p.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      gl_Position.y+=gl_Position.w*pixelLift;
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
   cat.colorSpace=THREE.SRGBColorSpace;
   this.catUniforms={map:{value:cat},windowMask:this.uniforms.windowMask,offset:{value:-2.5}};
   const catMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false,uniforms:this.catUniforms,
    vertexShader:`varying vec2 vUv;varying vec2 point;uniform float offset;
     void main(){vUv=uv;vec3 p=position;p.y+=offset;point=p.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying vec2 vUv;varying vec2 point;uniform sampler2D map;uniform sampler2D windowMask;
     void main(){vec4 c=texture2D(map,vUv);float mask=texture2D(windowMask,point/4.+.5).a;
      if(c.a<.12||mask<.02)discard;
      if(c.r>.5&&c.g<c.r*.23&&c.b<c.r*.30)discard;
      if(c.r>.6&&c.g>c.r*.78&&c.b<c.r*.17)discard;
      gl_FragColor=vec4(c.rgb*.78,c.a*mask);
      #include <colorspace_fragment>
     }`});
   this.catMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.65,1.65),catMaterial);this.catMesh.position.z=.09;
   this.catMesh.renderOrder=2.5;this.root.add(this.catMesh);
   book.colorSpace=THREE.SRGBColorSpace;
   this.bookUniforms={map:{value:book},windowMask:this.uniforms.windowMask,offset:{value:-3.}};
   const bookMaterial=catMaterial.clone();bookMaterial.uniforms=this.bookUniforms;
   this.bookMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1*book.image.height/book.image.width),bookMaterial);
   this.bookMesh.position.z=.095;this.bookMesh.renderOrder=2.6;this.root.add(this.bookMesh);
   this.root.visible=true;onReady();
  }).catch(onError);
 }
  interruptIdle(){interruptIdle(this.idleState);wakeCharacter(this.rest);}
  update(dt,time,{swingSpeed=0,spinSpeed=0,stretch=0,busy=false,reduced}){
    const idle=stepIdle(this.idleState,this.idleState.active?dt*.3:dt,{reduced});
    const sleeping=stepRest(this.rest,dt,{active:busy||Math.abs(swingSpeed)>1.4||Math.abs(spinSpeed)>2,reduced});
    this.uniforms.sleepAmount.value=sleeping;
    this.uniforms.glitch.value=reduced?0:Math.min(.65,Math.max(0,(Math.abs(swingSpeed)+Math.abs(spinSpeed)*.5-3)/6));
    const exasperationTarget=Math.max(0,Math.min(1,(stretch-.6)/4));
    this.uniforms.exasperation.value=exasperationTarget>.12?1:0;
    this.uniforms.idleKind.value={none:0,sip:1,pucker:2,cat:3}[idle.kind];this.uniforms.idleAmount.value=idle.amount;
    if(this.catUniforms)this.catUniforms.offset.value=-2.5+(this.previewPose==='cat'?1:idle.kind==='cat'?idle.amount:0)*1.72;
    const pose=stepCharacter(this.state,dt,{spinSpeed,swingSpeed,reduced});
    const ease=reduced?1:1-Math.exp(-7*dt);
    this.look.x+=((this.desktopEyes.matches?this.pointer.x:0)-this.look.x)*ease;this.look.y+=((this.desktopEyes.matches?this.pointer.y:0)-this.look.y)*ease;
    this.uniforms.look.value.set(reduced?0:this.look.x,reduced?0:this.look.y);
    this.uniforms.look.value.multiplyScalar(1-sleeping);
    const blend=reduced?1:1-Math.exp(-12*dt);
    this.uniforms.shakeMix.value+=(Number(pose.face==='shake')-this.uniforms.shakeMix.value)*blend;
    this.uniforms.look.value.multiplyScalar(1-this.uniforms.shakeMix.value);
    this.uniforms.idleAmount.value*=1-this.uniforms.shakeMix.value;
    const flight=this.flight,h=Math.min(dt,.04);
    const energy=Math.abs(swingSpeed)+Math.abs(spinSpeed)*.6;
    const wild=!reduced&&(energy>3.5||this.previewPose==='sway');
    if(wild){
      if(!flight.wild)flight.direction=Math.sign(spinSpeed||swingSpeed||1);
      flight.vx+=((swingSpeed||Math.sin(time*9)*5)*1.8-flight.x*2)*h;
      flight.vy+=(Math.sin(time*7)*energy*.65-flight.y*2)*h;
      flight.spin+=(flight.direction*6-flight.spin)*Math.min(1,h*5);
    }else{
      flight.vx+=(-flight.x*28-flight.vx*9)*h;
      flight.vy+=(-flight.y*28-flight.vy*9)*h;
      const home=Math.atan2(Math.sin(flight.angle),Math.cos(flight.angle));
      flight.spin+=(-home*24-flight.spin*8)*h;
    }
    flight.wild=wild;
    flight.vx=Math.max(-5,Math.min(5,flight.vx));flight.vy=Math.max(-4,Math.min(4,flight.vy));flight.spin=Math.max(-9,Math.min(9,flight.spin));
    flight.x+=flight.vx*h;flight.y+=flight.vy*h;flight.angle+=flight.spin*h;
    for(const [axis,velocity,limit] of [['x','vx',.56],['y','vy',.43]]){
      if(Math.abs(flight[axis])>limit){flight[axis]=Math.sign(flight[axis])*limit;flight[velocity]*=-.72;flight.spin+=flight[velocity]*.7;}
    }
    if(reduced){flight.x=flight.y=flight.angle=flight.vx=flight.vy=flight.spin=0;}
    this.uniforms.headShift.value.set(flight.x,flight.y);this.uniforms.headTilt.value=flight.angle;
    this.uniforms.clock.value=reduced?0:time;
    if(this.previewPose){
      this.uniforms.shakeMix.value=Number(this.previewPose==='sway');
      this.uniforms.exasperation.value=Number(this.previewPose==='pull');
      this.uniforms.sleepAmount.value=Number(this.previewPose==='read'||this.previewPose==='sleep');
    }
    if(this.bookUniforms)this.bookUniforms.offset.value=-3+this.uniforms.sleepAmount.value*2.05;
    return {...pose,face:this.uniforms.exasperation.value>.5?'pull':sleeping>.8?'read':pose.face,exasperation:this.uniforms.exasperation.value,idleKind:idle.kind,idleAmount:idle.amount};
  }
}
