/* Heightfield/drop equations adapted from WebGL Water by Evan Wallace, © 2011.
 * https://madebyevan.com/webgl-water/water.js — MIT, see ../vendor/LICENSE-water.txt.
 * Three.js port: half-float ping-pong targets; normals sampled by the surface shader.
 * The original pool, cubemap, sphere and raytraced walls are intentionally not loaded.
 */
import * as THREE from '../vendor/three.module.js';
const vertex=`varying vec2 coord; void main(){coord=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const fragment=`
  precision highp float;
  uniform sampler2D state;
  uniform vec2 delta;
  uniform vec4 drop;
  varying vec2 coord;
  void main(){
    vec4 info=texture2D(state,coord);
    vec2 dx=vec2(delta.x,0.),dy=vec2(0.,delta.y);
    float average=(texture2D(state,coord-dx).r+texture2D(state,coord-dy).r+
      texture2D(state,coord+dx).r+texture2D(state,coord+dy).r)*.25;
    info.g+=(average-info.r)*2.;
    info.g*=.992;
    info.r+=info.g;
    float splash=max(0.,1.-length(drop.xy-coord)/max(.001,drop.z));
    info.r+=(.5-cos(splash*3.14159265)*.5)*drop.w;
    // Absorbing edges prevent energy building up under the white vignette.
    float edge=min(min(coord.x,1.-coord.x),min(coord.y,1.-coord.y));
    info.rg*=mix(.84,1.,smoothstep(0.,.08,edge));
    gl_FragColor=vec4(clamp(info.rg,vec2(-.5),vec2(.5)),0.,1.);
  }`;
export class WaterField{
  constructor(renderer,size=128){
    this.renderer=renderer;this.time=0;this.nextDrop=.2;this.pending=null;this.frames=0;
    const options={type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false};
    this.a=new THREE.WebGLRenderTarget(size,size,options);this.b=this.a.clone();
    this.uniforms={state:{value:this.a.texture},delta:{value:new THREE.Vector2(1/size,1/size)},drop:{value:new THREE.Vector4(.5,.5,.04,0)}};
    this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:vertex,fragmentShader:fragment,depthTest:false,depthWrite:false});
    this.scene=new THREE.Scene();this.camera=new THREE.Camera();
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));
    const old=renderer.getRenderTarget(),color=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();
    renderer.setClearColor(0,0);renderer.setRenderTarget(this.a);renderer.clear();renderer.setRenderTarget(this.b);renderer.clear();
    renderer.setRenderTarget(old);renderer.setClearColor(color,alpha);
  }
  disturb(u,v,strength=.014){
    if(u<0||u>1||v<.2||v>1)return;
    this.pending=[u,v,.045,strength];
  }
  advance(dt){
    this.time+=dt;
    if(!this.pending&&this.time>=this.nextDrop){
      // Gentle swell also continues when nobody is touching the bag.
      const t=this.time;this.pending=[.5+.37*Math.sin(t*1.17),.55+.32*Math.cos(t*.73),.08,.0045];
      this.nextDrop=this.time+.55;
    }
    const old=this.renderer.getRenderTarget();
    for(let step=0;step<2;step++){
      this.uniforms.state.value=this.a.texture;
      this.uniforms.drop.value.set(...(step===0&&this.pending?this.pending:[0,0,.01,0]));
      this.renderer.setRenderTarget(this.b);this.renderer.render(this.scene,this.camera);
      [this.a,this.b]=[this.b,this.a];
    }
    this.pending=null;this.renderer.setRenderTarget(old);this.frames++;
    return this.a.texture;
  }
}
