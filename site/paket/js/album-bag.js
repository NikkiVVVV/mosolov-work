import * as THREE from '../vendor/three.module.js';
import { PlasticSheet } from './plastic.js?v=20260930-cosmos-final';
import { SceneBoundary } from './scene-boundary.js?v=20260930-fullscreen';

// The picture stays fixed behind a separate, locally deformable plastic sheet.
export function createAlbumBag(){
  const slot=document.createElement('div');slot.className='album-bag-slot';slot.id='album-surprise';
  const surprise=document.createElement('img');surprise.className='album-bag-surprise';surprise.src='./assets/album/surprise.webp';surprise.alt='Горилла с неожиданным жестом';surprise.loading='lazy';surprise.draggable=false;
  const bag=document.createElement('button');bag.type='button';bag.className='album-bag';
  bag.setAttribute('aria-label','Пакет с сюрпризом. Потяните или нажмите, чтобы смять. Стрелки сминают, Escape расправляет.');
  const fallback=document.createElement('img');fallback.className='album-bag-fallback';fallback.src='./assets/bag-mobile.webp';fallback.alt='';fallback.draggable=false;fallback.loading='lazy';
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');bag.append(fallback,canvas);slot.append(surprise,bag);
  const hint=document.createElement('div');hint.className='album-bag-hint';hint.setAttribute('aria-hidden','true');
  hint.innerHTML=`<svg viewBox="0 0 240 190" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path class="hint-line" pathLength="1" d="M125 102 Q137 88 151 81"/>
    <path class="hint-head" pathLength="1" d="M139 82 L153 79 L150 93"/>
    <text class="hint-word" x="12" y="148" transform="rotate(-8 12 148)">Разверни</text>
  </svg>`;
  slot.append(hint);
  function dismissHint(){slot.dataset.hint='used';}
  const hintObserver=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)){
      if(slot.dataset.hint!=='used')slot.dataset.hint='shown';
      hintObserver.disconnect();
    }
  },{threshold:.05});
  hintObserver.observe(slot);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false,started=false,renderer=null,sheet=null,geometry=null,scene=null,camera=null,mesh=null,alpha=null;
  let raf=0,timer=0,last=0,dirty=true,drag=null,keyTarget=null,worldWidth=3.6;
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  function stop(){cancelAnimationFrame(raf);clearTimeout(timer);raf=timer=0;last=0;}
  function wake(){if(renderer&&sheet&&visible&&!document.hidden&&!raf&&!timer)raf=requestAnimationFrame(frame);}
  function draw(){
    geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
    renderer.render(scene,camera);dirty=false;
    let change=0;for(let i=0;i<sheet.positions.length;i++)change=Math.max(change,Math.abs(sheet.positions[i]-sheet.rest[i]));
    slot.dataset.deformation=change.toFixed(3);
  }
  function frame(time){
    raf=0;if(!visible||document.hidden)return;
    const dt=Math.min((time-last)/1000||1/60,.05);last=time;
    let changed=false;
    if(sheet.grabs.size){changed=sheet.step();}
    else if(!motion.matches){changed=sheet.relax(dt);}
    if(dirty||changed)draw();
    if(sheet.grabs.size&&sheet.needsStep)raf=requestAnimationFrame(frame);
    else if(sheet.needsStep&&!motion.matches)timer=setTimeout(()=>{timer=0;wake();},50);
  }
  function resize(){
    if(!renderer)return;
    const w=slot.clientWidth,h=slot.clientHeight;if(!w||!h)return;
    worldWidth=4.4*w/h;camera.left=-worldWidth/2;camera.right=worldWidth/2;camera.top=2.2;camera.bottom=-2.2;camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h,false);
    sheet.boundary.configure(4.4,0,0,0,0,0,0,0,worldWidth);dirty=true;wake();
  }
  async function init(){
    try{
      const texture=await new THREE.TextureLoader().loadAsync('./assets/bag-mobile.webp');texture.colorSpace=THREE.SRGBColorSpace;
      renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
      sheet=new PlasticSheet(3.15,4.2,18,24,12);sheet.boundary=new SceneBoundary();sheet.reducedMotion=motion.matches;
      geometry=new THREE.PlaneGeometry(sheet.width,sheet.height,sheet.columns,sheet.rows);
      geometry.setAttribute('position',new THREE.BufferAttribute(sheet.positions,3).setUsage(THREE.DynamicDrawUsage));
      // Opaque body hides the surprise; alpha testing keeps the die-cut handle and silhouette.
      const material=new THREE.MeshPhongMaterial({map:texture,side:THREE.DoubleSide,alphaTest:.35,shininess:16,specular:0x171717});
      mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
      scene=new THREE.Scene();scene.add(mesh,new THREE.AmbientLight(0xffffff,2.1));
      const light=new THREE.DirectionalLight(0xffffff,1.2);light.position.set(-3,4,6);scene.add(light);
      camera=new THREE.OrthographicCamera(-1.8,1.8,2.2,-2.2,.1,20);camera.position.z=10;
      const sample=document.createElement('canvas');sample.width=192;sample.height=256;
      const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(texture.image,0,0,192,256);alpha=ctx.getImageData(0,0,192,256).data;
      resize();draw();slot.dataset.ready='true';slot.dataset.state='ready';wake();
    }catch(error){
      slot.dataset.state='fallback';renderer?.dispose();renderer=null;
      console.warn('Album bag uses image fallback:',error);
    }
  }
  function point(event){const r=slot.getBoundingClientRect();return [(event.clientX-r.left)/r.width*worldWidth-worldWidth/2,2.2-(event.clientY-r.top)/r.height*4.4,0];}
  function hit(event){
    const p=point(event);ndc.set(p[0]/(worldWidth/2),p[1]/2.2);ray.setFromCamera(ndc,camera);
    geometry.computeBoundingSphere();mesh.updateMatrixWorld(true);
    return ray.intersectObject(mesh).find(h=>{const x=Math.min(191,Math.max(0,Math.floor(h.uv.x*192))),y=Math.min(255,Math.max(0,Math.floor((1-h.uv.y)*256)));return alpha[(y*192+x)*4+3]>90;});
  }
  function crumple(){
    dismissHint();
    if(!sheet){slot.classList.toggle('is-fallback-open');return;}
    const vertex=sheet.columns+Math.round(sheet.rows*.3)*(sheet.columns+1),p=Array.from(sheet.positions.slice(vertex*3,vertex*3+3));
    sheet.grab('tap',vertex,p);sheet.move('tap',[p[0]-1.8,p[1]-.8,0]);
    for(let i=0;i<24;i++)sheet.step();sheet.release('tap');dirty=true;draw();wake();
  }
  bag.addEventListener('pointerdown',event=>{
    if(event.button!==0||drag)return;
    if(!sheet){dismissHint();drag={id:event.pointerId,start:point(event),moved:false};bag.setPointerCapture(event.pointerId);return;}
    const found=hit(event);if(!found)return;dismissHint();
    const candidates=[found.face.a,found.face.b,found.face.c];candidates.sort((a,b)=>new THREE.Vector3().fromArray(sheet.positions,a*3).distanceToSquared(found.point)-new THREE.Vector3().fromArray(sheet.positions,b*3).distanceToSquared(found.point));
    const p=point(event);sheet.grab(event.pointerId,candidates[0],p);drag={id:event.pointerId,start:p,moved:false};
    bag.setPointerCapture(event.pointerId);bag.classList.add('is-dragging');
  });
  bag.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;const p=point(event);
    if(Math.hypot(p[0]-drag.start[0],p[1]-drag.start[1])>.04)drag.moved=true;
    if(sheet){sheet.move(event.pointerId,p);wake();}
    else{slot.classList.add('is-fallback-open');fallback.style.transform=`translate(${(p[0]-drag.start[0])*20}px,${-(p[1]-drag.start[1])*20}px) scaleX(.65)`;}
  });
  function release(event){
    if(!drag||event.pointerId!==drag.id)return;const tap=!drag.moved&&event.type==='pointerup';
    sheet?.release(event.pointerId);drag=null;bag.classList.remove('is-dragging');if(bag.hasPointerCapture(event.pointerId))bag.releasePointerCapture(event.pointerId);
    if(tap)crumple();wake();
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>bag.addEventListener(type,release));
  bag.addEventListener('click',event=>{if(event.detail===0)crumple();});
  function reset(){sheet?.reset();slot.classList.remove('is-fallback-open');fallback.style.transform='';dirty=true;if(sheet)draw();wake();}
  bag.addEventListener('dblclick',reset);
  bag.addEventListener('keydown',event=>{
    if(event.key==='Escape'){reset();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||!sheet)return;event.preventDefault();dismissHint();
    const vertex=Math.round(sheet.rows*.35)*(sheet.columns+1)+sheet.columns;
    if(!sheet.grabs.has('keyboard')){keyTarget=Array.from(sheet.positions.slice(vertex*3,vertex*3+3));sheet.grab('keyboard',vertex,keyTarget);}
    keyTarget[0]+=(event.key==='ArrowRight'?.35:0)-(event.key==='ArrowLeft'?.35:0);keyTarget[1]+=(event.key==='ArrowUp'?.35:0)-(event.key==='ArrowDown'?.35:0);
    sheet.move('keyboard',keyTarget);wake();
  });
  bag.addEventListener('keyup',()=>{sheet?.release('keyboard');wake();});
  bag.addEventListener('blur',()=>{sheet?.releaseAll();drag=null;bag.classList.remove('is-dragging');wake();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){if(!started){started=true;init();}else wake();}else{sheet?.releaseAll();stop();}}).observe(slot);
  new ResizeObserver(resize).observe(slot);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){sheet?.releaseAll();stop();}else wake();});
  motion.addEventListener('change',()=>{if(sheet)sheet.reducedMotion=motion.matches;stop();dirty=true;wake();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();slot.dataset.ready='false';slot.dataset.state='fallback';renderer=null;sheet=null;});
  return slot;
}
