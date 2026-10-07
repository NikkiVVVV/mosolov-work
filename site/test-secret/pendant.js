import { showPendantFallback } from './pendant-fallback.js?v=91';
import * as THREE from './vendor/three.module.js';
import { track } from './portfolio-analytics.js?v=63';
import { clamp, createSpatialMotion, stepSpatialMotion, releaseSpatialMotion, positionToDragTargets, stepArrival, ambientTargets } from './pendant-motion.js?v=67';
import { orientationTargets, screenRoll, requestOrientationAccess } from './pendant-sensors.js?v=roll27';
import { BraidedCord } from './pendant-cord.js?v=65';
import { shapes, caseGeometry, screenMask } from './pendant-shapes.js?v=52';
import { createCaseFinishes, finishes } from './pendant-finishes.js?v=80';
import { PendantOverlay } from './pendant-overlay.js?v=65';
import { PendantViewport, touchIntent } from './pendant-viewport.js?v=67';
import { PendantEntrance } from './pendant-entrance.js?v=148';
import { PendantCharacter } from './pendant-character.js?v=90';

class Pendant {
  constructor(block) {
    this.block = block; this.host = block.querySelector('[data-pendant]');
    this.note = block.querySelector('.pendant-note'); this.tools = block.querySelector('.pendant-tools');
    this.home = this.host.parentNode; this.returnAnchor = document.createComment('pendant-home');
    this.host.before(this.returnAnchor);
    this.mobile = matchMedia('(max-width:640px), (hover:none) and (pointer:coarse) and (max-height:640px)');
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.motion = createSpatialMotion(); this.state = this.motion.swing; this.yaw = 0; this.yawTarget = 0;
    this.lean = 0; this.sensorTarget = 0; this.sensorDepth = 0;
    this.arrival={offset:0,velocity:0}; this.elapsed=0;
    this.visible = true; this.paused = false; this.ready = false; this.frame = 0;
    this.intro=new PendantEntrance(this);
    try { this.init(); } catch (error) { this.fallback('3D недоступно — показана статичная подвеска.'); console.warn('Pendant unavailable:', error); }
  }
  fallback(message) {
    this.failed = true; this.resizeObserver?.disconnect(); this.intersection?.disconnect();
    if(this.orientation)this.disableTilt();
    cancelAnimationFrame(this.frame); this.frame = 0; this.ready = false;
    this.host.dataset.ready = 'false';
    for (const b of this.tools.querySelectorAll('button')) b.disabled = true;
    this.note.textContent = message;
    this.intro?.finish();
    this.overlay?.layer.remove(); this.renderer?.domElement.remove(); this.renderer?.dispose();
    showPendantFallback(this.block,{reduced:this.reduced.matches});
  }
  init() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.mobile.matches?1.25:1.5));
    this.renderer.setClearColor(0xffffff, 0); this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    const canvas = this.renderer.domElement;
    this.overlay = new PendantOverlay(this.renderer);this.hitSurface=this.overlay.hit;
    this.overlay.layer.style.visibility="hidden";
    this.viewport=new PendantViewport(this.renderer,this.overlay.layer);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
    this.camera.position.set(0, .55, 11); this.camera.lookAt(0, .55, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x525259, 3));
    const key = new THREE.DirectionalLight(0xfff9f1, 4); key.position.set(-3, 5, 7); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xe5eeff, 3); rim.position.set(4, 2, -2); this.scene.add(rim);
    // A small baked studio environment gives metal highlights without external HDR files.
    const studio = new THREE.Scene(); studio.background = new THREE.Color('#686b70');
    for (const [x,y,z,sx,sy,sz] of [[-4,2,2,.1,7,4],[4,1,0,.1,5,3],[0,5,0,6,.1,4]]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      panel.position.set(x,y,z); studio.add(panel);
    }
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(studio, .1); this.scene.environment = this.environment.texture;
    pmrem.dispose(); studio.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    this.pivot = new THREE.Group(); this.pivot.position.y = 3.6; this.scene.add(this.pivot);
    this.body = new THREE.Group(); this.body.position.y = -3.7; this.pivot.add(this.body);
    this.bodyCentre = new THREE.Vector3();
    const graphite = new THREE.MeshPhysicalMaterial({ color: 0x27282b, metalness: .8, roughness: .27 });
    this.caseMaterial=graphite;
    const silver = new THREE.MeshPhysicalMaterial({ color: 0x777b80, metalness: .96, roughness: .2 });
    this.bezelMaterial=silver;
    this.savedCaseColor='frosted-glass';
    this.caseFinishes=createCaseFinishes(this.body);
    this.setCaseColor(this.savedCaseColor);
    const black = new THREE.MeshStandardMaterial({ color: 0x060607, roughness: .9, metalness: .05 });
    const geometry=caseGeometry('classic');this.savedShape='classic';
    const back = new THREE.Mesh(geometry.back,graphite);
    back.position.z=-.39;this.body.add(back);this.hitMesh=back;this.backMesh=back;
    const bezel=new THREE.Mesh(geometry.bezel,silver);
    bezel.position.z=-.02;this.body.add(bezel);this.bezelMesh=bezel;
    const lining = new THREE.Mesh(geometry.lining, black);
    lining.position.z = .04; this.body.add(lining);
    this.lining=lining;this.darkLining=black;this.lightLining=new THREE.MeshBasicMaterial({color:0xd9dad3});
    this.character=new PendantCharacter(this.body,()=>{
      if(this.failed)return;
      this.ready=true;this.host.dataset.ready='true';
      if(!this.intro.active&&!this.reduced.matches){this.arrival.offset=8;this.state.angle=.12;this.motion.twist.angle=-.15;}
      this.overlay.layer.style.visibility='';this.wake();
    },()=>this.fallback('Не удалось загрузить 3D — показана статичная подвеска.'));
    const eye = new THREE.Mesh(new THREE.TorusGeometry(.13,.055,8,24), graphite);
    eye.position.set(0,1.64,-.08); this.body.add(eye);this.attachmentEye=eye;
    const cordCanvas = document.createElement('canvas'); cordCanvas.width=32; cordCanvas.height=128;
    const ctx = cordCanvas.getContext('2d'); ctx.fillStyle='#171719'; ctx.fillRect(0,0,32,128);
    ctx.strokeStyle='#414144'; ctx.lineWidth=2;
    for(let y=-32;y<160;y+=12){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(32,y+25);ctx.moveTo(32,y);ctx.lineTo(0,y+25);ctx.stroke();}
    const cordMap = new THREE.CanvasTexture(cordCanvas); cordMap.colorSpace=THREE.SRGBColorSpace;
    this.cordMaterial = new THREE.MeshStandardMaterial({map:cordMap,roughness:.94,color:0xcccccc});
    this.cord = new BraidedCord(this.scene,this.body,this.cordMaterial,{compact:this.mobile.matches});
    this.applyTheme();
    document.addEventListener('portfolio:theme',()=>this.applyTheme());
    this.intro.mount();
    this.bind(); this.resize();
    window.addEventListener('orientationchange',()=>{this.sensorZero=null;this.sensorTarget=0;this.sensorDepth=0;},{passive:true});
    this.resizeObserver = new ResizeObserver(()=>this.queueResize()); this.resizeObserver.observe(this.host);
    this.intersection = new IntersectionObserver(entries=>{this.visible=this.intro.active||entries[0].isIntersecting||Boolean(this.drag);this.overlay.layer.hidden=!this.visible;if(this.visible)this.wake();else{cancelAnimationFrame(this.frame);this.frame=0;}},{rootMargin:'64px'});
    this.intersection.observe(this.host);
    window.addEventListener('resize',()=>this.queueResize(),{passive:true});
    window.addEventListener('scroll',()=>{
      // Mobile layer scrolls natively with its profile; desktop sticky anchors need a camera update.
      if(!this.viewport.mobile)this.queueResize();
    },{passive:true});
    this.mobile.addEventListener('change',()=>this.queueResize());
    document.addEventListener('portfolio:profile-layout',e=>{
      if(this.mobile.matches||this.dialog?.open||this.intro.active)return;
      this.profileMovingUntil=performance.now()+(e.detail?.duration||0);this.queueResize();
    });
    this.host.addEventListener('focusin',()=>this.wake());
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;}else this.wake();});
    this.reduced.addEventListener('change',()=>this.reset());
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.fallback('3D приостановлено — показана статичная подвеска.');});
    this.wake();
  }
  applyTheme(){
    if(this.failed||!this.lining)return;
    this.lining.material=document.documentElement.dataset.theme==='dark'?this.darkLining:this.lightLining;
    this.host.dataset.interior=document.documentElement.dataset.theme==='dark'?'dark':'light';
    this.renderer.render(this.scene,this.camera);this.wake();
  }
  queueResize(){this.viewportDirty=true;this.wake();}
  resize(schedule=true){
    if(this.failed)return;
    this.viewportDirty=false;
    if(this.intro.active&&this.intro.mounted){this.intro.renderDevice();if(schedule)this.wake();return;}
    const rect=this.host.getBoundingClientRect(),{width,height}=rect; if(!width||!height)return;
    this.renderer.transmissionResolutionScale=this.mobile.matches?.5:1;
    const view=this.viewport.sync({width:innerWidth,height:innerHeight,screenHeight:Math.max(screen.height,screen.width),mobile:this.mobile.matches,dialog:Boolean(this.dialog?.open),scrollX,scrollY},rect);
    const {left,top}=view;
    // Only the device captures touch; the surrounding page still scrolls normally.
    this.hitSurface.style.touchAction='none';
    this.camera.clearViewOffset();this.camera.aspect=width/height;
    const inProfile=Boolean(this.home.closest('.profile'))&&!this.dialog?.open;
    const mobile=inProfile&&this.mobile.matches;
    this.camera.zoom=this.dialog?.open?1.55:inProfile?1.17:1;
    // Expand the view to the whole viewport while preserving the original anchor and scale.
    this.camera.position.z=Math.max(10.8,3.85/(2*Math.tan(16*Math.PI/180)*this.camera.aspect));
    let shiftX=0,shiftY=0;
    if(mobile){
      const desiredWidth=.85*Math.min(300,width*.86,(height-96)*3.08/3.24);
      this.camera.zoom=desiredWidth/(height*3.08/(2*Math.tan(16*Math.PI/180)*this.camera.position.z));
    }
    this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
    if(inProfile){
      if(mobile){
        const bottom=new THREE.Vector3(0,-1.72,.1).project(this.camera);
        shiftY=height-16-(.5-bottom.y*.5)*height;
      }
      // Desktop stays centred on the profile anchor, independent of shell size.
    }
    this.camera.setViewOffset(width,height,-left-shiftX,-top-shiftY,view.width,view.height);
    if(schedule)this.wake();
  }
  wake(){if(!this.failed&&!this.frame&&this.visible&&!document.hidden){this.last=performance.now();this.frame=requestAnimationFrame(t=>this.tick(t));}}
  tick(time){
    this.frame=0;
    // Up to 60 fps with the smaller mobile buffer; avoid redundant frames on 120 Hz screens.
    if(this.mobile.matches&&time-this.last<1000/60-.5){
      this.frame=requestAnimationFrame(t=>this.tick(t));return;
    }
    const dt=Math.min((time-this.last)/1000,.05);this.last=time;
    const reduced=this.reduced.matches;
    if(this.viewportDirty||time<this.profileMovingUntil)this.resize(false);
    if(this.intro.active){this.intro.tick(dt,reduced);return;}
    if(this.dialog?.open){this.tickConfigurator(dt,reduced);return;}
    if(this.ready&&!reduced){this.elapsed+=dt;if(!this.drag)stepArrival(this.arrival,dt);}
    const ambient=ambientTargets(this.elapsed);
    if(this.drag&&!this.drag.spin)this.solveGrab();
    const targets=this.drag&&!this.drag.spin?this.drag.targets:{swing:this.sensorTarget+(reduced?0:ambient.swing),depth:this.sensorDepth+(reduced?0:ambient.depth)};
    if(reduced||(this.drag&&!this.drag.spin)){
      for(const [key,axis] of Object.entries(this.motion)){axis.angle=targets[key]||0;axis.velocity=0;}
      this.yaw=this.yawTarget;this.lean=0;
    }else{
      stepSpatialMotion(this.motion,dt,targets,Boolean(this.drag));
      this.yaw+=clamp((this.yawTarget-this.yaw)*(1-Math.exp(-8*dt)),-3.8*dt,3.8*dt);
      this.lean+=(-this.state.velocity*.035-this.lean)*(1-Math.exp(-12*dt));
    }
    this.pivot.position.y=3.6+this.arrival.offset;
    this.pivot.rotation.set(this.motion.depth.angle,0,this.state.angle,'YXZ');
    this.body.position.y=-3.7-this.motion.stretch.angle;
    this.body.rotation.set(-this.motion.depth.angle*.18,this.yaw+this.motion.twist.angle,-this.state.velocity*.012);
    const characterPose=this.character.update(dt,this.elapsed,{swing:this.state.angle,swingSpeed:this.state.velocity,
      busy:Boolean(this.drag),stretch:this.motion.stretch.angle,spinSpeed:this.motion.twist.velocity+(this.yaw-this.previousYaw||0)/Math.max(dt,.001),reduced});
    this.host.dataset.stretch=this.motion.stretch.angle.toFixed(3);this.host.dataset.exasperation=characterPose.exasperation.toFixed(3);
    this.host.dataset.headHits=String(this.character.state.hits);
    this.host.dataset.headX=characterPose.headX.toFixed(3);
    this.previousYaw=this.yaw;
    this.host.dataset.idleReaction=characterPose.idleKind;this.host.dataset.idleAmount=characterPose.idleAmount.toFixed(2);
    this.host.dataset.expression=characterPose.face;
    this.host.dataset.lookX=this.character.look.x.toFixed(2);
    this.scene.updateMatrixWorld();
    const ropeSpeed=this.cord.update(dt,Boolean(this.drag),this.body.rotation.y,reduced||this.snapCord,this.arrival.offset);
    this.snapCord=false;
    this.renderer.render(this.scene,this.camera);
    this.overlay.update(this.body,this.camera);
    this.host.dataset.angle=this.state.angle.toFixed(3);this.host.dataset.yaw=this.body.rotation.y.toFixed(3);
    this.host.dataset.depth=this.motion.depth.angle.toFixed(3);this.host.dataset.twist=this.motion.twist.angle.toFixed(3);
    this.host.dataset.ropeSpeed=ropeSpeed.toFixed(3);
    this.host.dataset.held=String(Boolean(this.drag));this.host.dataset.arrival=this.arrival.offset.toFixed(3);
    const axesMoving=Object.entries(this.motion).some(([key,axis])=>{
      const error=axis.angle-(targets[key]||0);
      return Math.abs(axis.velocity)>.001||Math.abs(key==='twist'?Math.atan2(Math.sin(error),Math.cos(error)):error)>.001;
    });
    const moving=(this.ready&&!reduced)||axesMoving||Math.abs(this.yaw-this.yawTarget)>.0005||Math.abs(this.lean)>.0005||ropeSpeed>.018;
    this.host.dataset.rendering=moving&&!reduced?'active':'idle';
    if(moving&&!reduced&&this.visible&&!document.hidden)this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  hit(e){
    const r=this.renderer.domElement.getBoundingClientRect();
    const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);
    return ray.intersectObject(this.hitMesh)[0]||null;
  }
  solveGrab(){
    const d=this.drag,r=this.renderer.domElement.getBoundingClientRect();
    const ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((d.cursorX-r.left)/r.width*2-1,-(d.cursorY-r.top)/r.height*2+1),this.camera);
    const point=ray.ray.intersectPlane(d.plane,new THREE.Vector3());if(!point)return;
    // Solve the grabbed local point, not the centre. Hold the camera steady during drag.
    // Repeating the inverse compensates for the changing orientation of an edge grip.
    let t={...d.targets};
    for(let i=0;i<5;i++){
      const pivot=new THREE.Quaternion().setFromEuler(new THREE.Euler(t.depth,0,t.swing,'YXZ'));
      const body=new THREE.Quaternion().setFromEuler(new THREE.Euler(-t.depth*.18,this.yaw+t.twist,0));
      const offset=d.localGrip.clone().applyQuaternion(pivot.multiply(body));
      const centre=point.clone().sub(offset);
      t=positionToDragTargets(centre.x,centre.y-this.arrival.offset,centre.z,t.twist);
    }
    d.targets=t;
  }
  bind(){
    const canvas=this.hitSurface;
    window.addEventListener('pointermove',e=>{
      
      if(e.pointerType==='touch')return;
      const r=this.hitSurface.getBoundingClientRect();
      this.character.pointer.x=clamp((e.clientX-r.left-r.width/2)/Math.max(160,innerWidth*.28),-1,1);
      this.character.pointer.y=clamp((e.clientY-r.top-r.height/2)/Math.max(160,innerHeight*.28),-1,1);
      this.wake();
    },{passive:true});
    document.documentElement.addEventListener('pointerleave',()=>{this.character.pointer={x:0,y:0};});
    canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0||this.drag||this.configDrag||this.touchCandidate)return;
      
      const hit=this.hit(e);if(!hit)return;
      const grip=this.body.worldToLocal(hit.point.clone());
      if(!e.shiftKey)this.yawTarget=this.yaw;
      if(this.dialog?.open){canvas.setPointerCapture(e.pointerId);this.configDrag={id:e.pointerId,x:e.clientX,angle:this.configAngle};this.wake();return;}
      const gesture={touch:e.pointerType==='touch',id:e.pointerId,x:e.clientX,y:e.clientY,angle:this.state.angle,depth:this.motion.depth.angle,
        twist:this.motion.twist.angle,yaw:this.yawTarget,grip:grip.x/1.5,localGrip:grip,
        cursorX:e.clientX,cursorY:e.clientY,zoom:this.camera.zoom,plane:new THREE.Plane(new THREE.Vector3(0,0,1),-hit.point.z),
        targets:{swing:this.state.angle,depth:this.motion.depth.angle,twist:this.motion.twist.angle,stretch:this.motion.stretch.angle},
        spin:e.shiftKey,moved:false,time:performance.now(),lastTime:performance.now(),lastX:e.clientX,lastY:e.clientY,vx:0,vy:0};
      if(gesture.touch)this.touchCandidate=gesture;
      else{this.drag=gesture;canvas.setPointerCapture(e.pointerId);}
      this.wake();
    });
    canvas.addEventListener('pointermove',e=>{
      if(this.touchCandidate?.id===e.pointerId){
        const candidate=this.touchCandidate,intent=touchIntent(e.clientX-candidate.x,e.clientY-candidate.y);
        if(intent==='pending')return;
        this.touchCandidate=null;
        this.drag=candidate;canvas.setPointerCapture(e.pointerId);
      }
      if(this.configDrag&&e.pointerId===this.configDrag.id){
        this.configAngle=this.configDrag.angle+(e.clientX-this.configDrag.x)/this.host.clientWidth*Math.PI*2;
        this.wake();return;
      }
      if(!this.drag||e.pointerId!==this.drag.id)return;
      const d=this.drag,dx=e.clientX-d.x,dy=e.clientY-d.y,w=this.host.clientWidth;
      const now=performance.now(),delta=Math.max((now-d.lastTime)/1000,.008);
      d.vx=clamp((e.clientX-d.lastX)/w/delta,-3,3);d.vy=clamp((e.clientY-d.lastY)/w/delta,-3,3);
      d.lastX=e.clientX;d.lastY=e.clientY;d.lastTime=now;d.cursorX=e.clientX;d.cursorY=e.clientY;
      if(Math.hypot(dx,dy)>6)d.moved=true;
      if(d.spin)this.yawTarget=d.yaw+dx/w*Math.PI*2;
      else d.targets.twist=d.twist+clamp(dx/w*(.55+Math.abs(d.grip)*.65)+dy/w*d.grip*.3,-.4,.4);
      this.wake();
    });
    const release=(e,cancelled=false)=>{
      if(this.touchCandidate?.id===e.pointerId){
        const candidate=this.touchCandidate;this.touchCandidate=null;
        if(!cancelled&&touchIntent(e.clientX-candidate.x,e.clientY-candidate.y)==='pending'&&performance.now()-candidate.time<320)this.zoom();
        return;
      }
      if(this.configDrag&&e.pointerId===this.configDrag.id){
        this.configDrag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);this.wake();return;
      }
      if(!this.drag||this.drag.id!==e.pointerId)return;
      const d=this.drag,click=!cancelled&&!d.moved&&performance.now()-d.time<320;
      if(!cancelled&&d.moved)track('pendant_drag');
      if(!cancelled&&d.moved&&!d.spin){
        d.cursorX=e.clientX;d.cursorY=e.clientY;this.solveGrab();
        for(const [key,axis] of Object.entries(this.motion))axis.angle=d.targets[key]||0;
        this.host.dataset.releaseStretch=this.motion.stretch.angle.toFixed(3);
      }
      const recent=performance.now()-d.lastTime<100;
      if(!cancelled&&d.moved&&!d.spin&&!this.reduced.matches)releaseSpatialMotion(this.motion,recent?d.vx:0,recent?d.vy:0,d.grip);
      this.drag=null;
      if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
      if(cancelled)for(const axis of Object.values(this.motion))axis.velocity=0;
      if(click)this.zoom();this.wake();
    };
    canvas.addEventListener('pointerup',e=>release(e));canvas.addEventListener('pointercancel',e=>release(e,true));
    canvas.addEventListener('lostpointercapture',e=>release(e,true));
    canvas.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','r','R'].includes(e.key))e.preventDefault();
      if(this.dialog?.open){
        if(e.key==='ArrowLeft'||e.key==='ArrowRight'){this.configAngle+=(e.key==='ArrowLeft'?-.2:.2);}
        this.wake();return;
      }
      if(e.key==='ArrowLeft'||e.key==='ArrowRight')this.nudge(e.key==='ArrowLeft'?-1:1);
      if(e.key==='ArrowUp'||e.key==='ArrowDown'){this.motion.depth.velocity=e.key==='ArrowUp'?.18:-.18;this.wake();}
      if(e.key==='Enter'||e.key===' ')this.zoom();if(e.key.toLowerCase()==='r')this.spin();
    });
    this.tools.addEventListener('click',e=>{
      const action=e.target.closest('button')?.dataset.action;
      if(action==='nudge'){if(this.reduced.matches){this.note.textContent='Уменьшение движения включено в системе.';return;}this.nudge();}
      if(action==='spin')this.spin();if(action==='zoom')this.zoom();if(action==='reset')this.reset();if(action==='tilt')this.toggleTilt();
    });
    this.orientation=e=>{
      if(!this.tilt||document.hidden||this.dialog?.open||this.drag)return;
      if(!Number.isFinite(e.gamma)||!Number.isFinite(e.beta))return;
      clearTimeout(this.sensorTimer);
      const screenAngle=screen.orientation?.angle??window.orientation??0;
      if(this.sensorZero===null&&screenRoll(e,screenAngle)!==null){this.sensorZero={gamma:e.gamma,beta:e.beta};this.note.textContent='Наклон включён';}
      const targets=orientationTargets(e,this.sensorZero,screenAngle);
      this.sensorTarget=targets.swing;this.sensorDepth=targets.depth;this.wake();
    };
  }
  nudge(direction=1){
    if(this.reduced.matches)return;
    this.state.velocity=1.3*direction;this.motion.depth.velocity=.08;this.motion.twist.velocity=.55*direction;this.wake();
  }
  spin(){
    if(this.reduced.matches){this.note.textContent='Уменьшение движения включено в системе.';return;}
    this.yawTarget=Math.round(this.yawTarget/(Math.PI*2))*Math.PI*2+Math.PI*2;this.wake();
  }
  disableTilt(){
    if(this.tiltGesture){document.removeEventListener('pointerup',this.tiltGesture,true);this.tiltGesture=null;}
    window.removeEventListener('deviceorientation',this.orientation);clearTimeout(this.sensorTimer);
    this.tilt=false;this.sensorTarget=0;this.sensorDepth=0;this.sensorZero=null;
    this.tools.querySelector('[data-action=tilt]').setAttribute('aria-pressed','false');
  }
  async requestTiltOnEntry(){
    const result=await this.toggleTilt();
    if(result!=='gesture-required'||this.failed||this.reduced.matches)return;
    this.tiltGesture=()=>{
      document.removeEventListener('pointerup',this.tiltGesture,true);this.tiltGesture=null;
      void this.toggleTilt({hasGesture:true});
    };
    document.addEventListener('pointerup',this.tiltGesture,true);
  }
  async toggleTilt({hasGesture=Boolean(navigator.userActivation?.isActive)}={}){
    if(this.tiltPending)return;
    if(this.tilt){this.disableTilt();this.note.textContent='Наклон выключен';this.wake();return;}
    if(this.reduced.matches){this.note.textContent='Датчик отключён при уменьшении движения.';return;}
    if(!isSecureContext||!window.DeviceOrientationEvent){this.note.textContent='Для наклона нужен телефон и HTTPS. Перетаскивание доступно сейчас.';return;}
    const button=this.tools.querySelector('[data-action=tilt]');button.disabled=true;this.tiltPending=true;
    try{
      const permission=await requestOrientationAccess(DeviceOrientationEvent,hasGesture);
      if(permission!=='granted'){this.note.textContent='';return permission;}
      if(this.failed||this.reduced.matches)return;
      this.tilt=true;this.sensorZero=null;button.setAttribute('aria-pressed','true');
      window.addEventListener('deviceorientation',this.orientation,{passive:true});
      this.note.textContent='Ожидаю датчик — слегка наклони телефон';
      this.sensorTimer=setTimeout(()=>{if(this.sensorZero===null){this.disableTilt();this.note.textContent='Датчик не передаёт данные. Можно перетаскивать вручную.';}},4000);
    }catch{this.note.textContent='Датчик недоступен. Можно перетаскивать вручную.';}
    finally{button.disabled=false;this.tiltPending=false;}
  }
  reset(){this.arrival={offset:0,velocity:0};this.disableTilt();this.motion=createSpatialMotion();this.state=this.motion.swing;this.yawTarget=0;this.yaw=0;this.lean=0;this.snapCord=true;this.note.textContent='';this.wake();}
  setCaseShape(id){
    const geometry=caseGeometry(id);
    this.backMesh.geometry=geometry.back;this.bezelMesh.geometry=geometry.bezel;
    const scale=geometry.screenScale;
    this.lining.geometry=geometry.lining;
    this.character.uniforms.windowMask.value=screenMask(id);
    this.attachmentEye.position.y=geometry.eyeY;
    this.cord.attachmentOffset=geometry.eyeY-1.64;
    this.cord.knot.position.y=1.98+this.cord.attachmentOffset;
    this.cord.tail.position.y=1.73+this.cord.attachmentOffset;
    this.snapCord=true;
    this.caseFinishes.setShape(id,scale);this.host.dataset.caseShape=id;
    this.wake();
  }
  setCaseColor(color){
    this.caseFinishes.apply(color,this.caseMaterial,this.bezelMaterial);
    this.host.dataset.caseColor=color;
  }
  tickConfigurator(dt,reduced){
    if(!reduced&&!this.configDrag)this.configAngle+=dt*.3;
    this.pivot.position.y=0;this.pivot.rotation.set(0,0,0);
    this.body.position.y=.6;this.body.rotation.set(0,this.configAngle,0);
    this.character.update(dt,this.elapsed,{swingSpeed:0,spinSpeed:0,busy:true,reduced});
    this.scene.updateMatrixWorld();this.renderer.render(this.scene,this.camera);this.overlay.update(this.body,this.camera);
    this.host.dataset.mode='configurator';this.host.dataset.yaw=this.configAngle.toFixed(3);this.host.dataset.depth='0.000';
    if(!reduced&&this.visible&&!document.hidden)this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  zoom(){
    if(this.dialog?.open)return;
    
    if(!this.dialog){
      this.dialog=document.createElement('dialog');this.dialog.className='pendant-dialog pendant-config';
      this.dialog.setAttribute('aria-labelledby','config-title');
      this.dialog.innerHTML=`<div class="config-content"><div class="config-header"><h2 class="config-title" id="config-title">HUMAN INSIDE</h2><button type="button" class="config-dismiss" data-dismiss aria-label="Закрыть настройки"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div class="config-preview"><div data-preview-slot></div></div>
        <div class="config-controls">
          <div class="config-row"><span class="config-label" id="shape-label">Форма</span><div class="config-shapes" role="group" aria-labelledby="shape-label">
            ${shapes.map(s=>`<button type="button" class="config-shape" data-shape="${s.id}" aria-label="${s.ru}" title="${s.ru}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true">${s.icon}</svg></button>`).join('')}
          </div></div>
          <div class="config-row"><span class="config-label" id="color-label">Цвет</span><div class="config-colors" role="group" aria-labelledby="color-label">
            ${finishes.map(f=>`<button type="button" class="config-swatch ${f.id.startsWith('#')?'':f.id}" style="--swatch:${f.id.startsWith('#')?f.id:'#d9a1b6'}" data-color="${f.id}" aria-label="${f.ru}" title="${f.ru}" aria-pressed="false"></button>`).join('')}
          </div></div>
        </div></div>
        <div class="config-actions"><button type="button" class="config-close" data-close>Закрыть</button><button type="button" class="config-apply" data-apply>Применить</button></div>`;
      this.dialog.querySelectorAll('[data-close],[data-dismiss]').forEach(button=>button.addEventListener('click',()=>this.dialog.close()));
      this.dialog.querySelector('[data-apply]').addEventListener('click',()=>{
        this.savedCaseColor=this.previewCaseColor;this.savedShape=this.previewShape;
        this.dialog.close();
      });
      this.dialog.querySelectorAll('[data-color]').forEach(button=>button.addEventListener('click',()=>{
        this.previewCaseColor=button.dataset.color;this.setCaseColor(this.previewCaseColor);
        this.dialog.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));this.wake();
      }));
      this.dialog.querySelectorAll('[data-shape]').forEach(button=>button.addEventListener('click',()=>{
        this.previewShape=button.dataset.shape;this.setCaseShape(this.previewShape);
        this.dialog.querySelectorAll('[data-shape]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      }));
      document.body.append(this.dialog);
      this.dialog.addEventListener('scroll',()=>this.queueResize(),{passive:true});
      this.dialog.querySelector('.config-content').addEventListener('scroll',()=>this.queueResize(),{passive:true});
      this.dialog.addEventListener('close',()=>{
        this.setCaseColor(this.savedCaseColor);this.setCaseShape(this.savedShape);
        this.configDrag=null;this.returnAnchor.after(this.host);this.overlay.attach();
        for(const part of [this.cord.mesh,this.cord.knot,this.cord.tail,this.attachmentEye])part.visible=true;
        this.host.dataset.mode='pendant';this.snapCord=true;document.body.style.overflow=this.oldOverflow;this.resize();this.hitSurface.focus({preventScroll:true});
      });
      this.dialog.addEventListener('click',e=>{if(e.target===this.dialog){const r=this.dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.dialog.close();}});
    }
    this.oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    this.configAngle=-.15;this.previewCaseColor=this.savedCaseColor;this.previewShape=this.savedShape;
    this.dialog.querySelectorAll('[data-shape]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shape===this.savedShape)));
    this.dialog.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===this.savedCaseColor)));
    const english=document.documentElement.lang==='en';
    this.dialog.querySelector('.config-title').textContent='HUMAN INSIDE';
    this.dialog.querySelector('[data-dismiss]').setAttribute('aria-label',english?'Close settings':'Закрыть настройки');
    this.dialog.querySelector('#shape-label').textContent=english?'Shape':'Форма';
    this.dialog.querySelector('#color-label').textContent=english?'Color':'Цвет';
    this.dialog.querySelectorAll('[data-shape]').forEach((b,i)=>{b.setAttribute('aria-label',shapes[i][english?'en':'ru']);b.title=shapes[i][english?'en':'ru'];});
    this.dialog.querySelector('[data-apply]').textContent=english?'Apply':'Применить';
    this.dialog.querySelector('[data-close]').textContent=english?'Close':'Закрыть';
    this.dialog.querySelectorAll('[data-color]').forEach((b,i)=>{b.setAttribute('aria-label',finishes[i][english?'en':'ru']);b.title=finishes[i][english?'en':'ru'];});
    this.setCaseColor(this.previewCaseColor);
    for(const part of [this.cord.mesh,this.cord.knot,this.cord.tail,this.attachmentEye])part.visible=false;
    this.dialog.querySelector('[data-preview-slot]').append(this.host);this.overlay.attach(this.dialog);
    this.dialog.showModal();track('pendant_open');this.dialog.querySelector('[data-color][aria-pressed=true]').focus({preventScroll:true});this.visible=true;this.resize();
  }

}
for(const block of document.querySelectorAll('[data-pendant-block]'))new Pendant(block);
