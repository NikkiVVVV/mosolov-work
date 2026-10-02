import * as THREE from '../vendor/three.module.js';
import { EDGE_RISE, EDGE_SLOPE } from './scene-boundary.js?v=20260930-fullscreen';

import { RockTerrain } from './rock-terrain.js';
import { SpaceFlight } from './space-flight.js';
export { rockHeight } from './rock-terrain.js';

const vertex=`varying vec2 vUv;varying vec3 terrainPosition; void main(){vUv=uv;terrainPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`
  varying vec2 vUv;
  varying vec3 terrainPosition;
  uniform sampler2D backdrop;
  uniform sampler2D waves;
  uniform float time;
  uniform float sea;
  uniform float cosmos;
  uniform float appear;
  uniform vec2 texel;
  uniform vec2 tilt;
  uniform vec2 lowerEdge;
  float heightAt(vec2 p){return texture2D(waves,p).r;}
  vec2 starHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
  void main(){
    vec2 p=vUv+tilt*.006;
    if(cosmos>.5){
      vec3 sky=vec3(.002);
      for(int layer=0;layer<3;layer++){
        float depth=float(layer)+1.;
        vec2 grid=p*(10.+depth*7.)+vec2(time*(.10+depth*.065),time*(.055+depth*.03));
        vec2 cell=floor(grid),seed=starHash(cell+depth*31.);
        vec2 point=fract(grid)-(.16+seed*.68);
        float core=1.-smoothstep(.012,.055,length(point));
        float trail=exp(-abs(point.y-point.x*.5)*130.)*exp(-abs(point.x)*27.);
        float twinkle=.72+.28*sin(time*.8+seed.x*25.);
        sky+=mix(vec3(.62,.76,1.),vec3(1.),seed.y)*(core+trail*.2)*step(.42,seed.x)*twinkle/depth;
      }
      gl_FragColor=vec4(sky,appear);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      return;
    }
    float edgeDistance=p.y-lowerEdge.x-lowerEdge.y*(p.x-.5);
    float aa=max(fwidth(edgeDistance),.0001);
    float edge=smoothstep(-aa,aa,edgeDistance);
    if(edge<=0.)discard;
    float wet=sea;
    vec2 grad=vec2(heightAt(p+vec2(texel.x,0.))-heightAt(p-vec2(texel.x,0.)),
      heightAt(p+vec2(0.,texel.y))-heightAt(p-vec2(0.,texel.y)))*9.;
    grad+=vec2(cos(p.x*24.+p.y*11.+time*.9),sin(p.y*28.-p.x*9.-time*.7))*.017;
    vec2 warped=clamp(p+grad*wet*edge*.17,0.,1.);
    // Crop off the painted white perimeter: full bleed at the top and both sides.
    vec2 crop=mix(vec2(.18,.36)+warped*vec2(.64,.47),warped,sea);
    vec3 color=texture2D(backdrop,crop).rgb;
    if(sea<.5){
      vec3 faceNormal=normalize(cross(dFdx(terrainPosition),dFdy(terrainPosition)));
      float light=max(0.,dot(faceNormal,normalize(vec3(-.55,.7,1.))));
      color*=.76+.32*light;
    }
    vec3 normal=normalize(vec3(-grad*2.,1.));
    float sparkle=pow(max(0.,dot(normal,normalize(vec3(-.12,.2,1.)))),48.);
    float focus=clamp(abs(dFdx(grad.x)+dFdy(grad.y))*26.,0.,.22);
    vec2 flow=p*vec2(22.,26.)+grad*3.;
    float rays=abs(sin(flow.x+sin(flow.y*.8+time*.42)*1.7)+sin(flow.y+sin(flow.x*.7-time*.36)*1.6));
    float caustic=(1.-smoothstep(.025,.16,rays))*.16;
    color+=wet*edge*caustic;
    color+=wet*edge*(vec3(.11,.15,.14)*sparkle+focus*.45);
    // A one-pixel antialiased cut, without a white gradient.
    gl_FragColor=vec4(color,appear*edge);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
export class Environments{
  constructor({renderer,scene,sheet,stage,compact,reducedMotion,onChange,wake}){
    Object.assign(this,{renderer,sheet,stage,compact,reducedMotion,onChange,wake});
    this.mode='plain';this.clock=0;this.scale=1;this.water=null;this.loading=0;this.appear=1;this.maps=new Map();this.loads=new Map();this.floatMix=0;this.offsetX=0;this.offsetY=0;this.roll=0;this.landing=0;this.extension=0;
    const zero=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);zero.needsUpdate=true;
    this.spaceMix=0;this.spaceAngle=0;this.flight=new SpaceFlight();this.lift=0;
    this.tiltX=0;this.tiltY=0;this.tiltRipple=0;
    this.uniforms={tilt:{value:new THREE.Vector2()},backdrop:{value:zero},waves:{value:zero},time:{value:0},sea:{value:0},cosmos:{value:0},appear:{value:1},texel:{value:new THREE.Vector2(1/128,1/128)},lowerEdge:{value:new THREE.Vector2()}};
    this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false});
    this.flatGeometry=new THREE.PlaneGeometry(4,4.48);this.mesh=new THREE.Mesh(this.flatGeometry,this.material);this.mesh.position.z=-2;this.mesh.visible=false;this.mesh.renderOrder=-2;scene.add(this.mesh);
    this.bagUniforms={bagScale:{value:1},waterMode:{value:0},waterTime:this.uniforms.time,waterMap:this.uniforms.waves,waterBounds:{value:new THREE.Vector2(4.48,2.24)},waterOffset:{value:new THREE.Vector2()}};
    this.sceneHeight=7.6;this.sceneLower=4.7;this.bottomExtension=0;
    this.terrain=new RockTerrain();this.terrainGeometry=new THREE.BufferGeometry();
    this.terrainGeometry.setAttribute('position',new THREE.BufferAttribute(this.terrain.positions,3));
    this.terrainGeometry.setAttribute('uv',new THREE.BufferAttribute(this.terrain.uv,2));
    this.terrainGeometry.setIndex(new THREE.BufferAttribute(this.terrain.indices,1));
    this.rollCos=1;this.rollSin=0;
    this.rockSurface=(x,y)=>(this.terrain.sample((x*this.rollCos-y*this.rollSin)*this.scale+this.offsetX,(x*this.rollSin+y*this.rollCos)*this.scale+this.offsetY+this.lift)+.032)/this.scale;
    this.controls=[...document.querySelectorAll('input[name="bag-environment"]')];
    this.controls.forEach(control=>control.addEventListener('change',()=>{if(control.checked)this.select(control.value);}));
    stage.addEventListener('pointerdown',event=>this.touch(event),{passive:true});
    stage.addEventListener('pointermove',event=>{if(event.buttons)this.touch(event);},{passive:true});
  }
  get animated(){return (this.mode==='plain'||this.mode==='sea'||this.mode==='space')&&!this.reducedMotion.matches;}
  get transitioning(){return this.appear<1||Math.abs(this.floatMix-(this.mode==='sea'&&!this.reducedMotion.matches?1:0))>.001||Math.abs(this.spaceMix-(this.mode==='space'&&!this.reducedMotion.matches?1:0))>.001||(!this.animated&&(Math.abs(this.roll)>.001||Math.abs(this.offsetX)+Math.abs(this.offsetY)>.001))||this.landing>0;}
  decorateBag(shader){
    Object.assign(shader.uniforms,this.bagUniforms);
    const waterVaryings='varying vec2 vWaterUv;varying float vWaterDepth;';
    shader.vertexShader=`${waterVaryings}uniform float bagScale;uniform float waterMode;uniform float waterTime;uniform sampler2D waterMap;uniform vec2 waterBounds;uniform vec2 waterOffset;\n`+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vec2 waterUv=vec2((position.x*bagScale+waterOffset.x)/4.+.5,(position.y*bagScale+waterOffset.y+waterBounds.y)/waterBounds.x);
      float swell=waterMode>.001?texture2D(waterMap,waterUv).r:0.;
      // The centre sits below the surface, with a dry lifted upper rim.
      float dip=.25*(1.-smoothstep(1.25,2.1,position.y));
      transformed.z+=waterMode*(swell*2.2+.065*sin(position.x*1.7+waterTime*.9)+.035*cos(position.y*1.5-waterTime*.7)-dip);
      transformed.y+=waterMode*.018*sin(waterTime*.9+position.x*.6);
      vWaterUv=waterUv;
      vWaterDepth=swell*2.2-transformed.z;
    `);
    shader.fragmentShader=`${waterVaryings}uniform float waterMode;uniform float waterTime;uniform sampler2D waterMap;\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec2 waterGrad=vec2(0.);
      if(waterMode>.001){
        vec2 wt=vec2(1./128.,0.);
        waterGrad=vec2(texture2D(waterMap,vWaterUv+wt).r-texture2D(waterMap,vWaterUv-wt).r,
          texture2D(waterMap,vWaterUv+wt.yx).r-texture2D(waterMap,vWaterUv-wt.yx).r)*9.;
        waterGrad+=vec2(cos(vWaterUv.x*24.+vWaterUv.y*11.+waterTime*.9),sin(vWaterUv.y*28.-vWaterUv.x*9.-waterTime*.7))*.017;
      }
      float submerged=waterMode*smoothstep(-.025,.20,vWaterDepth);
      #ifdef USE_MAP
        vec4 bagInk=texture2D(map,vMapUv);
        if(submerged>.001){
          vec4 refractedInk=texture2D(map,clamp(vMapUv+waterGrad*.075*submerged,0.,1.));
          // Preserve the true silhouette / handle; refract only the printed surface.
          bagInk.rgb=mix(bagInk.rgb,refractedInk.rgb,refractedInk.a*submerged);
        }
        diffuseColor*=bagInk;
      #endif
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      if(waterMode>.001){
      vec2 flow=vWaterUv*vec2(22.,26.)+waterGrad*3.;
      float rays=abs(sin(flow.x+sin(flow.y*.8+waterTime*.42)*1.7)+sin(flow.y+sin(flow.x*.7-waterTime*.36)*1.6));
      float caustic=(1.-smoothstep(.025,.16,rays))*.16;
      vec3 waterNormal=normalize(vec3(-waterGrad*2.,1.));
      float sparkle=pow(max(0.,dot(waterNormal,normalize(vec3(-.12,.2,1.)))),48.);
      outgoingLight=mix(outgoingLight,outgoingLight*vec3(.66,.86,.88)+vec3(.025,.07,.075),submerged*.75);
      outgoingLight+=submerged*(caustic+vec3(.055,.08,.085)*sparkle);
      // A narrow meniscus marks the few folds that break the water surface.
      outgoingLight+=waterMode*(1.-smoothstep(.005,.03,abs(vWaterDepth)))*vec3(.06,.09,.09);
      }
      #include <opaque_fragment>
    `);
  }
  async select(mode){
    if(!['plain','rocks','sea','space'].includes(mode))return;
    const request=++this.loading;
    this.stage.setAttribute('aria-busy','true');
    try{
      if((mode==='sea'||mode==='rocks')&&!this.maps.has(mode)){
        if(!this.loads.has(mode))this.loads.set(mode,new THREE.TextureLoader().loadAsync(new URL(`../assets/environments/${mode}.webp`,import.meta.url).href).catch(error=>{this.loads.delete(mode);throw error;}));
        const map=await this.loads.get(mode);
        map.colorSpace=THREE.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=THREE.LinearFilter;this.maps.set(mode,map);
      }
      if(mode==='sea'&&!this.water&&this.renderer.extensions.has('EXT_color_buffer_float')){
        const {WaterField}=await import('./water.js');
        if(request!==this.loading)return;
        this.water=new WaterField(this.renderer,128);
      }
      if(request!==this.loading)return;
      this.onChange(mode);
      this.mode=mode;this.landing=mode==='rocks'&&!this.reducedMotion.matches?1:0;
      if(mode==='space'){this.spaceAngle=this.roll;this.flight.enter(this.offsetX,this.offsetY);}
      else this.flight.pointer=null;
      this.sheet.setSurface(mode==='rocks'?this.rockSurface:null,mode);
      this.mesh.visible=mode!=='plain';this.mesh.userData.mode=mode;
      this.mesh.geometry=mode==='rocks'?this.terrainGeometry:this.flatGeometry;this.material.depthWrite=mode==='rocks';
      if(mode==='sea'||mode==='rocks')this.uniforms.backdrop.value=this.maps.get(mode);
      this.uniforms.cosmos.value=mode==='space'?1:0;
      this.uniforms.sea.value=mode==='sea'?1:0;this.bagUniforms.waterMode.value=this.reducedMotion.matches?(mode==='sea'?1:0):this.floatMix;
      this.appear=this.reducedMotion.matches||mode==='plain'?1:0;this.uniforms.appear.value=this.appear;
      this.controls.forEach(control=>{control.checked=control.value===mode;});
      this.stage.dataset.environment=mode;this.stage.removeAttribute('aria-busy');this.stage.removeAttribute('data-error');
      this.wake();
    }catch(error){
      if(request!==this.loading)return;
      this.controls.forEach(control=>{control.checked=control.value===this.mode;});
      this.stage.removeAttribute('aria-busy');this.stage.dataset.error='';
      console.warn('Environment unavailable:',error);
    }
  }
  place(x,y,height,extension=0,bottomExtension=0){
    this.bagUniforms.bagScale.value=this.scale;
    this.extension=extension;this.bottomExtension=bottomExtension;
    this.sceneHeight=height+extension+bottomExtension;this.sceneLower=height/2+bottomExtension;
    if(this.terrain.update(height,extension,bottomExtension)){
      this.terrainGeometry.attributes.position.needsUpdate=true;this.terrainGeometry.computeBoundingSphere();
      if(this.mode==='rocks'){this.sheet.surfaceSettling=true;this.sheet.surfaceAge=0;}
    }
    if(this.mode==='rocks'){this.mesh.position.set(x,y,0);this.mesh.scale.y=1;}
    else{this.mesh.position.set(x,y+(extension-bottomExtension)/2,-2);this.mesh.scale.y=this.sceneHeight/4.48;}
    this.uniforms.lowerEdge.value.set(EDGE_RISE/this.sceneHeight,EDGE_SLOPE*4/this.sceneHeight);
    this.bagUniforms.waterBounds.value.set(this.sceneHeight,this.sceneLower);
    this.bagUniforms.waterOffset.value.set(this.offsetX,this.offsetY+this.lift);
  }
  advance(dt){
    const target=this.mode==='sea'&&!this.reducedMotion.matches?1:0;
    this.floatMix+=(target-this.floatMix)*(1-Math.exp(-dt*2.2));
    if(Math.abs(target-this.floatMix)<.001)this.floatMix=target;
    this.bagUniforms.waterMode.value=this.reducedMotion.matches?(this.mode==='sea'?1:0):this.floatMix;
    this.landing=Math.max(0,this.landing-dt*.7);
    const spaceTarget=this.mode==='space'&&!this.reducedMotion.matches?1:0;
    this.spaceMix+=(spaceTarget-this.spaceMix)*(1-Math.exp(-dt*1.6));
    if(Math.abs(spaceTarget-this.spaceMix)<.001)this.spaceMix=spaceTarget;
    const free=!this.sheet.grabs.size;
    if(spaceTarget&&free)this.spaceAngle+=dt*.085*this.spaceMix;
    const breeze=this.mode==='plain'&&!this.reducedMotion.matches?1:0;
    const windX=breeze*(.023*Math.sin(this.clock*.65)+.008*Math.sin(this.clock*1.1));
    const windY=breeze*.014*Math.sin(this.clock*.82);
    const swayX=windX+this.floatMix*(this.tiltX*.035+.085*Math.sin(this.clock*.47)+.022*Math.sin(this.clock*.9));
    const swayY=windY+this.floatMix*(-this.tiltY*.025+.065*Math.sin(this.clock*.7)+.025*Math.cos(this.clock*.37));
    if(free){
      const targetRoll=spaceTarget?this.spaceAngle:this.floatMix*.035*Math.sin(this.clock*.53)+breeze*.012*Math.sin(this.clock*.72);
      const angle=Math.atan2(Math.sin(targetRoll-this.roll),Math.cos(targetRoll-this.roll));
      this.roll+=angle*(1-Math.exp(-dt*1.2));
      this.roll=Math.atan2(Math.sin(this.roll),Math.cos(this.roll));
      if(spaceTarget){
        const cos=Math.cos(this.roll),sin=Math.sin(this.roll),positions=this.sheet.positions;
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        for(let k=0;k<positions.length;k+=3){
          const x=(positions[k]*cos-positions[k+1]*sin)*this.scale,y=(positions[k]*sin+positions[k+1]*cos)*this.scale;
          minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        }
        this.flight.step(dt,{left:-1.94-minX,right:1.94-maxX,bottom:-this.sceneLower+.06-minY-this.lift,top:this.sceneHeight-this.sceneLower-.06-maxY-this.lift});
        this.offsetX=this.flight.x;this.offsetY=this.flight.y;
        this.stage.dataset.spaceOffset=`${this.offsetX.toFixed(3)},${this.offsetY.toFixed(3)}`;
        this.stage.dataset.spaceVelocity=`${this.flight.vx.toFixed(3)},${this.flight.vy.toFixed(3)}`;
        this.stage.dataset.spaceBounces=String(this.flight.bounces);
      }else{
        this.offsetX+=(swayX-this.offsetX)*(1-Math.exp(-dt*2));
        this.offsetY+=(swayY-this.offsetY)*(1-Math.exp(-dt*2));
      }
    }
    if(!this.animated&&Math.abs(this.roll)<.001)this.roll=0;
    this.rollCos=Math.cos(this.roll);this.rollSin=Math.sin(this.roll);
    this.stage.dataset.breeze=breeze?`${this.offsetX.toFixed(4)},${this.offsetY.toFixed(4)},${this.roll.toFixed(4)}`:'off';

    if(this.transitioning){this.appear=Math.min(1,this.appear+dt*3.5);this.uniforms.appear.value=this.appear;}
    if(this.animated){this.clock+=dt;this.uniforms.time.value=this.clock;}
    if(this.mode==='sea'&&this.water&&!this.reducedMotion.matches){
      this.uniforms.waves.value=this.water.advance(dt);this.stage.dataset.waterFrames=this.water.frames;
    }
  }
  setTilt(x,y,dx,dy){
    this.tiltX=x;this.tiltY=y;this.uniforms.tilt.value.set(x,y);
    if(this.reducedMotion.matches||this.sheet.grabs.size)return;
    if(this.mode==='space'){this.flight.vx+=dx*.035;this.flight.vy-=dy*.035;}
    if(this.mode==='sea'&&this.water&&performance.now()-this.tiltRipple>180&&Math.abs(dx)+Math.abs(dy)>.003){
      this.water.disturb(.5+x*.13,.53-y*.1,.0025);this.tiltRipple=performance.now();
    }
  }
  touch(event){
    if(this.mode==='space'&&!this.reducedMotion.matches){
      if(event.type==='pointerdown'&&this.sheet.grabs.size)this.flight.begin(event.pointerId,event.clientX,event.clientY,event.timeStamp);
      else if(event.type==='pointermove'&&this.sheet.grabs.size)this.flight.move(event.pointerId,event.clientX,event.clientY,event.timeStamp,this.stage.clientWidth/4);
      return;
    }
    if(this.mode!=='sea'||!this.water||this.reducedMotion.matches)return;
    const r=this.stage.getBoundingClientRect(),extra=this.extension*r.width/4,bottom=this.bottomExtension*r.width/4;
    this.water.disturb((event.clientX-r.left)/r.width,1-(event.clientY-r.top+extra)/(r.height+extra+bottom));
    this.stage.dataset.waterTouches=String(Number(this.stage.dataset.waterTouches||0)+1);
    this.wake();
  }
  release(event){this.flight.release(event.pointerId,event.timeStamp,event.type==='pointercancel');}
  cancelDrag(){this.flight.pointer=null;}
}
