import {createTiltInput} from './tilt-input.js?v=20261001-bag-surprise-final';
import * as THREE from '../vendor/three.module.js';
import { Environments } from './environments.js?v=20261001-bag-surprise-final';
import { SceneBoundary, EDGE_RISE } from './scene-boundary.js?v=20260930-fullscreen';
import { PlasticSheet } from './plastic.js?v=20260930-cosmos-final';
import { FoldIntro } from './fold-intro.js';
import { ScrollPull } from './scroll-pull.js';
import { renderSections } from './content.js?v=20261001-bag-surprise-final';

renderSections();
const canvas=document.querySelector('#bag-canvas');
const hitArea=document.querySelector('#bag-hit-area');
const stage=document.querySelector('#bag-stage');
const hero=document.querySelector('#hero');
const sceneFrame=document.querySelector('#scene-frame');
const fallback=document.querySelector('#bag-fallback');
const shadow=document.querySelector('#bag-shadow');
function revealPage(){document.documentElement.dataset.intro='done';window.dispatchEvent(new Event('bag-ready'));}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');

async function init(){
  const compact=matchMedia('(max-width: 600px), (pointer: coarse)').matches;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:!compact,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xffffff,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-2,2,3,-3,.1,30);
  camera.position.set(0,0,10);camera.lookAt(0,0,0);
  const texture=await new THREE.TextureLoader().loadAsync(new URL(compact?'../assets/bag-mobile.webp':'../assets/bag.png',import.meta.url).href);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=compact?1:Math.min(4,renderer.capabilities.getMaxAnisotropy());
  if(compact){texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;}
  const sheet=new PlasticSheet(3.15,4.2,compact?18:32,compact?24:44,compact?12:18);
  const boundary=new SceneBoundary();sheet.boundary=boundary;
  const scrollPull=new ScrollPull(sheet);
  const intro=new FoldIntro(sheet,document.documentElement.dataset.intro==='pending');
  if(intro.active)document.documentElement.dataset.intro='unfolding';
  let stageLeft=0,stageTop=0,stageWidth=0,stageHeight=0,stageFrameOffset=0,stageBottomExtension=0;
  let frameLeft=0,frameTop=0,frameWidth=0,frameHeight=0,frameRadius=16,frameTopRadius=0;
  let dirty=true,layoutDirty=true,pendingShape=false,pixelsPerUnit=100,width=innerWidth,height=innerHeight;
  sheet.reducedMotion=reducedMotion.matches;
  const geometry=new THREE.PlaneGeometry(sheet.width,sheet.height,sheet.columns,sheet.rows);
  geometry.setAttribute('position',new THREE.BufferAttribute(sheet.positions,3).setUsage(THREE.DynamicDrawUsage));
  const contactHeights=new Float32Array(sheet.count);
  geometry.setAttribute('surfaceZ',new THREE.BufferAttribute(contactHeights,1).setUsage(THREE.DynamicDrawUsage));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const material=compact?new THREE.MeshPhongMaterial({map:texture,side:THREE.FrontSide,shininess:20,specular:0x202020,alphaTest:.16}):new THREE.MeshPhysicalMaterial({map:texture,side:THREE.FrontSide,roughness:.63,metalness:0,clearcoat:.16,clearcoatRoughness:.52,ior:1.46,alphaTest:.16,alphaToCoverage:true});
  const backMaterial=material.clone();backMaterial.side=THREE.BackSide;
  // Environment followed by both bag skins.
  material.transparent=true;backMaterial.transparent=true;
  if(compact){backMaterial.shininess=12;}else{backMaterial.roughness=.72;backMaterial.clearcoat=.09;}
  function skin(mat,direction,inside=false){
    mat.onBeforeCompile=shader=>{
      environments.decorateBag(shader);
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
        #include <begin_vertex>
        float bagGap=0.007+0.016*sin(3.14159265*uv.x)*sin(3.14159265*uv.y);
        transformed+=normalize(objectNormal)*bagGap*${direction.toFixed(1)};
      `);
      if(inside)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
        #include <color_fragment>
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.57,0.55,0.50),0.68);
      `);
    };
    mat.customProgramCacheKey=()=>`plastic-skin-${direction}-${inside}`;
  }
  skin(material,1);skin(backMaterial,-1,true);
  const root=new THREE.Group();scene.add(root);
  const front=new THREE.Mesh(geometry,material),back=new THREE.Mesh(geometry,backMaterial);
  front.frustumCulled=back.frustumCulled=false;root.add(front,back);
  const contactMaterial=new THREE.ShaderMaterial({
    uniforms:{bagMap:{value:texture},strength:{value:0},onStone:{value:0},sceneBottom:{value:0},sceneSlope:{value:0},sceneCenter:{value:new THREE.Vector2()}},transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute float surfaceZ;uniform float onStone;varying float contact;varying vec2 shadowUv;varying vec2 shadowWorld;void main(){shadowUv=uv;vec3 local=position;local.xy+=vec2(.025,-.045);local.z=mix(-1.85,surfaceZ,onStone);contact=mix(1.,exp(-max(0.,position.z-surfaceZ)*3.),onStone);vec4 p=modelMatrix*vec4(local,1.);shadowWorld=p.xy;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform sampler2D bagMap;uniform float strength;uniform float sceneBottom;uniform float sceneSlope;uniform vec2 sceneCenter;varying float contact;varying vec2 shadowUv;varying vec2 shadowWorld;void main(){vec2 q=shadowWorld-sceneCenter;if(abs(q.x)>2.||q.y<sceneBottom+sceneSlope*q.x)discard;vec2 d=vec2(.009);float a=texture2D(bagMap,shadowUv).a*.4;a+=(texture2D(bagMap,shadowUv+d).a+texture2D(bagMap,shadowUv-d).a+texture2D(bagMap,shadowUv+vec2(d.x,-d.y)).a+texture2D(bagMap,shadowUv+vec2(-d.x,d.y)).a)*.15;gl_FragColor=vec4(.15,.15,.13,a*strength*contact);}`
  });
  const contactShadow=new THREE.Mesh(geometry,contactMaterial);contactShadow.frustumCulled=false;contactShadow.renderOrder=-1;root.add(contactShadow);
  const ambient=new THREE.AmbientLight(0xffffff,compact?2.1:1.35);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffffff,compact?1.2:1.7);key.position.set(-3,4,6);scene.add(key);
  if(!compact){const fill=new THREE.DirectionalLight(0xeaf2ff,.25);fill.position.set(4,-1,3);scene.add(fill);}
  canvas.dataset.quality=compact?'mobile':'desktop';canvas.dataset.vertices=sheet.count;
  canvas.dataset.pixelRatio=renderer.getPixelRatio();

  const alphaCanvas=document.createElement('canvas');alphaCanvas.width=256;alphaCanvas.height=Math.round(256*texture.image.height/texture.image.width);
  const alphaContext=alphaCanvas.getContext('2d',{willReadFrequently:true});alphaContext.drawImage(texture.image,0,0,alphaCanvas.width,alphaCanvas.height);
  const alpha=alphaContext.getImageData(0,0,alphaCanvas.width,alphaCanvas.height).data;
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),point=new THREE.Vector3();
  const dragPlane=new THREE.Plane(new THREE.Vector3(0,0,1),0),active=new Set();
  function pointer(event){
    ndc.set((event.clientX-frameLeft)/width*2-1,-(event.clientY-frameTop+scrollY)/height*2+1);ray.setFromCamera(ndc,camera);
  }
  function findHit(){
    geometry.boundingBox.getBoundingSphere(geometry.boundingSphere||(geometry.boundingSphere=new THREE.Sphere()));
    return ray.intersectObjects([front,back]).find(hit=>{
      const x=Math.max(0,Math.min(alphaCanvas.width-1,Math.floor(hit.uv.x*alphaCanvas.width)));
      const y=Math.max(0,Math.min(alphaCanvas.height-1,Math.floor((1-hit.uv.y)*alphaCanvas.height)));
      return alpha[(y*alphaCanvas.width+x)*4+3]>100;
    });
  }
  function layout(){
    const rect=stage.getBoundingClientRect();
    // All four modes share the full hero frame.
    const frameRect=sceneFrame.getBoundingClientRect();
    frameLeft=frameRect.left;frameTop=frameRect.top+scrollY;frameWidth=frameRect.width;frameHeight=frameRect.height;
    width=frameWidth;height=frameHeight;
    const frameStyle=getComputedStyle(sceneFrame);
    frameRadius=parseFloat(frameStyle.borderBottomLeftRadius)||0;frameTopRadius=parseFloat(frameStyle.borderTopLeftRadius)||0;
    stageLeft=rect.left;stageTop=rect.top+scrollY;stageWidth=rect.width;stageHeight=rect.height;stageFrameOffset=rect.top-frameRect.top;
    // Cache layout outside the animation loop. Scrolling only changes the viewport offset.
    pixelsPerUnit=stage.clientWidth/4;
    // Double the previous bag's target size, bounded by the available screen.
    const previousFit=(stageWidth-24)/pixelsPerUnit/Math.hypot(sheet.width,sheet.height);
    const desiredScale=2*1.08*1.15*.9*Math.min(1,previousFit);
    const widthFit=(stageWidth-32)/pixelsPerUnit/sheet.width;
    const heightFit=(stageHeight-176)/pixelsPerUnit/sheet.height;
    environments.scale=.98*Math.max(.18,Math.min(desiredScale,widthFit,heightFit));
    environments.lift=stageHeight*.04/pixelsPerUnit;
    stageBottomExtension=(frameRect.bottom-rect.bottom)/pixelsPerUnit+EDGE_RISE;
    const pixelRatio=Math.min(devicePixelRatio,2,Math.sqrt(1600000/(width*height)));
    if(Math.abs(renderer.getPixelRatio()-pixelRatio)>.01)renderer.setPixelRatio(pixelRatio);
    canvas.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);
    // Mobile browser toolbars resize the viewport; avoid reallocating buffers unnecessarily.
    if(canvas.width!==Math.floor(width*renderer.getPixelRatio())||canvas.height!==Math.floor(height*renderer.getPixelRatio()))renderer.setSize(width,height,false);
    const vw=width/pixelsPerUnit,vh=height/pixelsPerUnit;
    camera.left=-vw/2;camera.right=vw/2;camera.top=vh/2;camera.bottom=-vh/2;camera.updateProjectionMatrix();
    layoutDirty=false;dirty=true;
  }
  function anchor(){
    const x=(stageLeft-frameLeft+stageWidth/2-width/2)/pixelsPerUnit,y=(height/2-(stageTop-frameTop)-stageHeight/2)/pixelsPerUnit;
    root.scale.setScalar(environments.scale);
    root.position.set(x+environments.offsetX,y-scrollPull.pinOffset/pixelsPerUnit+environments.offsetY+environments.lift,0);
    root.rotation.set(-tiltY*(environments.mode==='rocks'?.008:.026),tiltX*(environments.mode==='rocks'?.008:.026),environments.roll);
    key.position.set(-3+tiltX*.3,4-tiltY*.3,6);
    canvas.dataset.tilt=`${tiltX.toFixed(3)},${tiltY.toFixed(3)}`;
    environments.place(x,y,stageHeight/pixelsPerUnit,stageFrameOffset/pixelsPerUnit,stageBottomExtension);
    const scale=environments.scale;
    boundary.configure(stageHeight/pixelsPerUnit/scale,stageFrameOffset/pixelsPerUnit/scale,environments.offsetX/scale,(environments.offsetY+environments.lift-scrollPull.pinOffset/pixelsPerUnit)/scale,environments.roll,stageBottomExtension/scale,frameRadius/pixelsPerUnit/scale,frameTopRadius/pixelsPerUnit/scale,4/scale);
    // Native document scrolling moves the canvas with its rounded parent.
    contactMaterial.uniforms.sceneBottom.value=boundary.bottom*scale;contactMaterial.uniforms.sceneSlope.value=boundary.slope;contactMaterial.uniforms.sceneCenter.value.set(x,y);
    root.updateMatrixWorld(true);
  }
  const hitBounds=new THREE.Box3();
  function updateHitArea(){
    const b=hitBounds.copy(geometry.boundingBox).applyMatrix4(root.matrixWorld);
    const left=b.min.x*pixelsPerUnit+width/2;
    const right=b.max.x*pixelsPerUnit+width/2;
    const top=height/2-b.max.y*pixelsPerUnit;
    const bottom=height/2-b.min.y*pixelsPerUnit;
    const x=Math.max(0,left),y=Math.max(0,top),r=Math.min(width,right),d=Math.min(height,bottom);
    const sceneryVisible=frameTop+frameHeight>scrollY&&frameTop-scrollY<innerHeight;
    const visible=r>x&&d>y&&sceneryVisible;
    hitArea.style.visibility=visible&&!intro.active?'visible':'hidden';
    hitArea.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
    const w=Math.max(0,r-x).toFixed(2)+'px',h=Math.max(0,d-y).toFixed(2)+'px';
    if(hitArea.style.width!==w)hitArea.style.width=w;
    if(hitArea.style.height!==h)hitArea.style.height=h;
    const shadowHeight=Math.min(32,frameHeight-bottom-7);
    const shadowInside=shadowHeight>=8&&bottom+7>=0;
    shadow.style.visibility=visible&&shadowInside&&environments.mode==='plain'?'visible':'hidden';
    shadow.style.transform=`translate3d(${((left+right)/2-120).toFixed(2)}px,${(bottom+7+(shadowHeight-32)/2).toFixed(2)}px,0) scale(${Math.max(.2,(right-left)*.8/240).toFixed(3)},${Math.max(0,shadowHeight/32).toFixed(3)})`;
    shadow.style.opacity=visible?(environments.mode==='plain'?'.8':'.35'):'0';
    return visible||sceneryVisible;
  }
  let lastScroll=Math.max(0,scrollY);
  function endScroll(){pendingShape=scrollPull.bake(pixelsPerUnit*environments.scale)||pendingShape;anchor();}
  function syncGeometry(){
    geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();pendingShape=false;
    if(environments.mode==='rocks'){
      for(let i=0;i<sheet.count;i++)contactHeights[i]=environments.rockSurface(sheet.positions[i*3]+.025,sheet.positions[i*3+1]-.045)-.020;
      geometry.attributes.surfaceZ.needsUpdate=true;
    }
  }
  function onScroll(){
    const next=Math.max(0,scrollY),delta=next-lastScroll;lastScroll=next;dirty=true;wake();
    if(environments.mode!=='plain'||intro.active||reducedMotion.matches||!delta||active.size||sheet.grabs.has('keyboard'))return;
    if(scrollPull.active||hitArea.style.visibility==='visible'){
      scrollPull.setScroll(next,delta,pixelsPerUnit*environments.scale);
      hero.dataset.scrollCompression=scrollPull.progress.toFixed(3);
    }
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  function markTouched(){hero.dataset.interacted='true';endScroll();}
  hitArea.addEventListener('pointerdown',event=>{
    hitArea.classList.remove('keyboard-focus');if(event.button!==0)return;
    if(scrollPull.apply())syncGeometry();
    geometry.computeBoundingSphere();anchor();pointer(event);const hit=findHit();if(!hit)return;
    event.preventDefault();markTouched();hitArea.focus({preventScroll:true});hitArea.setPointerCapture(event.pointerId);
    const local=root.worldToLocal(hit.point.clone());
    const candidates=[hit.face.a,hit.face.b,hit.face.c];
    candidates.sort((a,b)=>new THREE.Vector3().fromArray(sheet.positions,a*3).distanceToSquared(local)-new THREE.Vector3().fromArray(sheet.positions,b*3).distanceToSquared(local));
    sheet.grab(event.pointerId,candidates[0],[local.x,local.y,local.z]);
    environments.touch(event);
    active.add(event.pointerId);hitArea.classList.add('is-dragging');
  });
  hitArea.addEventListener('pointermove',event=>{
    pointer(event);
    if(active.has(event.pointerId)){
      event.preventDefault();ray.ray.intersectPlane(dragPlane,point);root.worldToLocal(point);
      sheet.move(event.pointerId,[point.x,point.y,point.z]);
      environments.touch(event);
      wake();
    }else if(event.pointerType==='mouse')hitArea.style.cursor=findHit()?'grab':'default';
  });
  function release(event){
    environments.release(event);
    sheet.release(event.pointerId);active.delete(event.pointerId);
    if(hitArea.hasPointerCapture(event.pointerId))hitArea.releasePointerCapture(event.pointerId);
    if(!active.size)hitArea.classList.remove('is-dragging');
    wake();
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>hitArea.addEventListener(type,release));
  hitArea.addEventListener('dblclick',()=>{scrollPull.reset();sheet.reset();pendingShape=true;dirty=true;wake();});
  document.addEventListener('keydown',event=>{if(event.key==='Tab')hitArea.classList.add('keyboard-focus');});
  let keyTarget;
  hitArea.addEventListener('keydown',event=>{
    hitArea.classList.add('keyboard-focus');
    if(event.key==='Escape'){scrollPull.reset();sheet.reset();pendingShape=true;dirty=true;wake();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();markTouched();
    const center=Math.floor(sheet.rows/2)*(sheet.columns+1)+Math.floor(sheet.columns/2);
    if(!sheet.grabs.has('keyboard')){keyTarget=Array.from(sheet.positions.slice(center*3,center*3+3));sheet.grab('keyboard',center,keyTarget);}
    keyTarget[0]+=(event.key==='ArrowRight'?.16:0)-(event.key==='ArrowLeft'?.16:0);
    keyTarget[1]+=(event.key==='ArrowUp'?.16:0)-(event.key==='ArrowDown'?.16:0);
    sheet.move('keyboard',keyTarget);
    wake();
  });
  hitArea.addEventListener('keyup',()=>{sheet.release('keyboard');wake();});
  hitArea.addEventListener('blur',()=>{sheet.releaseAll();environments.cancelDrag();wake();});
  reducedMotion.addEventListener('change',event=>{sheet.reducedMotion=event.matches;if(event.matches){endScroll();if(intro.active){intro.finish();pendingShape=true;revealPage();}}wake();});
  const sceneResize=new ResizeObserver(()=>{layoutDirty=true;wake();});sceneResize.observe(stage);sceneResize.observe(hero);sceneResize.observe(sceneFrame);
  window.addEventListener('resize',()=>{layoutDirty=true;wake();},{passive:true});
  let previous=performance.now(),accumulator=0,raf=0,frame=0,timer=0,contextLost=false,viewerOpen=false;
  const environments=new Environments({renderer,scene,sheet,stage,compact,reducedMotion,wake,onChange(mode){
    endScroll();sheet.releaseAll();active.clear();hitArea.classList.remove('is-dragging');
    contactMaterial.uniforms.strength.value=(mode==='plain'||mode==='space')?0:mode==='rocks'?.35:.13;
    contactMaterial.uniforms.onStone.value=mode==='rocks'?1:0;
    ambient.intensity=mode==='rocks'?1.35:compact?2.1:1.35;key.intensity=mode==='rocks'?1.65:compact?1.2:1.7;
    hero.dataset.environment=mode;hero.dataset.scrollCompression='0';
    stage.setAttribute('aria-label',mode==='rocks'?'Пакет на камнях':mode==='sea'?'Пакет в воде':mode==='space'?'Пакет в космосе':'Пакет на светлом фоне');pendingShape=true;dirty=true;
  }});
  let targetTiltX=0,targetTiltY=0,tiltX=0,tiltY=0;
  const tilt=createTiltInput(sceneFrame,(x,y)=>{targetTiltX=x;targetTiltY=y;dirty=true;wake();},{active:()=>!viewerOpen&&!intro.active});
  function cancelLoop(){cancelAnimationFrame(raf);clearTimeout(timer);raf=timer=0;}
  function wake(){
    if(document.hidden||contextLost||viewerOpen||raf)return;
    if(!timer&&performance.now()-previous>150)previous=performance.now()-1000/60;
    clearTimeout(timer);timer=0;raf=requestAnimationFrame(animate);
  }
  function animate(now){
    raf=0;
    if(document.hidden||contextLost||viewerOpen)return;
    if(frame&&now-previous<15){raf=requestAnimationFrame(animate);return;}
    if(layoutDirty)layout();
    if(pendingShape){syncGeometry();dirty=true;}
    anchor();
    if(!updateHitArea()&&!active.size){
      canvas.style.visibility='hidden';canvas.dataset.animation='offscreen';shadow.style.visibility='hidden';accumulator=0;if(intro.active){intro.finish();pendingShape=true;revealPage();}return;
    }
    canvas.style.visibility='visible';
    const elapsed=Math.min((now-previous)/1000,.08);previous=now;
    const tx=reducedMotion.matches||active.size?0:targetTiltX,ty=reducedMotion.matches||active.size?0:targetTiltY;
    const smoothing=1-Math.exp(-elapsed*5);
    const dx=(tx-tiltX)*smoothing,dy=(ty-tiltY)*smoothing;
    tiltX+=dx;tiltY+=dy;
    const tiltMoving=Math.abs(tx-tiltX)+Math.abs(ty-tiltY)>.001;
    if(Math.abs(dx)+Math.abs(dy)>.00001){environments.setTilt(tiltX,tiltY,dx,dy);dirty=true;}
    const environmentFrame=tiltMoving||environments.animated||environments.transitioning;
    if(environmentFrame||dirty){environments.advance(elapsed);anchor();dirty=true;}
    let changed=false;
    if(intro.active){
      changed=intro.advance(elapsed);canvas.dataset.introPhase=intro.phase;
      if(!intro.active)revealPage();
    }else if(scrollPull.active){changed=scrollPull.apply();accumulator=0;}
    else if(sheet.grabs.size){
      if(compact){changed=sheet.step()||changed;}
      else{
        accumulator+=Math.min(elapsed,.05);
        while(accumulator>=1/60){changed=sheet.step()||changed;accumulator-=1/60;}
      }
    }else{accumulator=0;changed=sheet.relax(elapsed)||changed;}
    changed=sheet.enforceBoundary()||changed;
    if(changed){
      syncGeometry();
    }
    if(dirty||changed||!frame){
      renderer.render(scene,camera);updateHitArea();dirty=false;
      canvas.dataset.renderCount=String(Number(canvas.dataset.renderCount||0)+1);
      if(!frame++){canvas.classList.add('is-ready');fallback.classList.add('is-hidden');fallback.setAttribute('aria-hidden','true');canvas.dataset.state='ready';}
    }
    canvas.dataset.animation=intro.active?'intro':scrollPull.active?'scroll':sheet.needsStep?(sheet.grabs.size?'dragging':'relaxing'):environments.animated?environments.mode:'idle';
    if(intro.active||(!scrollPull.active&&sheet.grabs.size&&sheet.needsStep)){
      // Mobile solver remains small (475 nodes); no catch-up work or waiting between input frames.
      raf=requestAnimationFrame(animate);
    }else if(environmentFrame){
      // 30 fps idle sea: two tiny 128² passes, no CPU readback or cloth solve. Input still runs at 60 fps.
      timer=setTimeout(()=>{timer=0;raf=requestAnimationFrame(animate);},Math.max(0,33-(performance.now()-now)-2));
    }else if(!scrollPull.active&&sheet.needsStep){
      timer=setTimeout(()=>{timer=0;raf=requestAnimationFrame(animate);},Math.max(0,50-(performance.now()-now)-2));
    }

  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;cancelLoop();canvas.classList.remove('is-ready');fallback.classList.remove('is-hidden');fallback.removeAttribute('aria-hidden');hitArea.style.visibility='hidden';canvas.dataset.state='fallback';shadow.style.visibility='hidden';revealPage();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelLoop();if(intro.active){intro.finish();pendingShape=true;revealPage();}sheet.releaseAll();environments.cancelDrag();active.clear();canvas.dataset.animation='hidden';}
    else{previous=performance.now();dirty=true;wake();}
  });
  document.addEventListener('photo-viewer-change',event=>{
    viewerOpen=event.detail.open;
    if(viewerOpen){tilt.reset();tilt.sync();cancelLoop();canvas.dataset.animation='modal';}
    else{tilt.sync();dirty=true;wake();}
  });
  window.addEventListener('pagehide',cancelLoop);
  window.addEventListener('pageshow',event=>{if(event.persisted){previous=performance.now();dirty=true;wake();}});
  wake();
}
init().catch(error=>{revealPage();canvas.dataset.state='fallback';hitArea.tabIndex=-1;console.error('Bag renderer unavailable:',error);});
