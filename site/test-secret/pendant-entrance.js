import { landingImpulse } from './pendant-motion.js?v=67';
import {entranceFrame,bootFrame} from './entrance-motion.js?v=66';

export class PendantEntrance {
  constructor(pendant){
    this.p=pendant;this.el=document.querySelector('.site-loader');this.active=Boolean(this.el&&document.documentElement.classList.contains('is-loading'));
    if(!this.active)return;
    this.assetReady=false;this.presentedAt=null;this.boxLayoutDirty=true;
    this.package=this.el.querySelector('.loader-package');this.deviceSlot=this.el.querySelector('.loader-device');
    this.el.querySelector('.loader-box').decode().catch(()=>{this.el.dataset.assetFailed='true';}).finally(()=>{this.assetReady=true;pendant.wake();});
    this.started=performance.now();this.readyAt=null;this.pageReady=false;this.fontProgress=0;this.pageProgress=0;this.displayed=[0,0,0];
    Promise.all([document.fonts.load('16px Werkzeug'),document.fonts.load('14px "IBM Plex Sans"')].map(task=>task.then(()=>{this.fontProgress+=.5;}))).then(()=>document.fonts.ready).then(()=>{this.fontProgress=1;});
    const appReady=document.documentElement.dataset.appReady==='true'?Promise.resolve():new Promise(resolve=>document.addEventListener('portfolio:ready',resolve,{once:true}));
    appReady.then(async()=>{
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('.layout img:not(.pendant-poster)')].map(img=>img.decode?.().catch(()=>{})));
      this.pageProgress=1;this.pageReady=true;pendant.wake();
    });
    this.watchdog=setTimeout(()=>this.finish(),11000);
  }
  mount(){
    if(!this.active)return;
    const p=this.p;
    this.previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    document.querySelector('.layout').inert=true;
    this.mounted=true;this.bootCamera=p.camera.clone();
    p.hitSurface.hidden=true;p.overlay.attach(this.package);p.overlay.layer.style.opacity='1';p.overlay.layer.style.visibility='';
    this.renderDevice();
  }
  renderDevice(){
    const p=this.p,rect=this.deviceSlot.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const view=p.viewport.sync({width:innerWidth,height:innerHeight,screenHeight:innerHeight,mobile:p.mobile.matches,dialog:true},rect);
    const camera=this.bootCamera;camera.clearViewOffset();camera.aspect=rect.width/rect.height;
    camera.position.set(0,0,11);camera.lookAt(0,0,0);
    camera.zoom=2*Math.tan(16*Math.PI/180)*11/Math.max(3.24,3.1/camera.aspect);
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
    camera.setViewOffset(rect.width,rect.height,-rect.left,-rect.top,view.width,view.height);
    p.pivot.position.set(0,0,0);p.pivot.rotation.set(0,0,0);p.body.position.set(0,0,0);p.body.rotation.set(0,0,0);
    p.character.root.visible=false;
    for(const part of [p.cord.mesh,p.cord.knot,p.cord.tail])part.visible=false;
    p.scene.updateMatrixWorld();p.renderer.render(p.scene,camera);this.boxLayoutDirty=false;
  }
  tick(dt,reduced){
    const p=this.p,elapsed=(performance.now()-this.started)/1000;
    if(this.assetReady&&this.presentedAt===null){this.presentedAt=elapsed;this.el.dataset.present='true';this.boxLayoutDirty=true;}
    const boot=bootFrame(this.presentedAt===null?-1:elapsed-this.presentedAt);
    this.el.dataset.boot=boot.powered?'on':'off';
    if(this.boxLayoutDirty)this.renderDevice();
    const targets=[this.fontProgress,(p.character.loaded||0)/p.character.totalTextures,this.pageProgress];
    targets.forEach((target,i)=>{this.displayed[i]=Math.min(target,this.displayed[i]+(boot.progressing?dt*.8:0));});
    const progress=this.displayed.reduce((sum,x)=>sum+x,0)/3;
    const bar=this.el.querySelector('.loader-progress');
    bar.setAttribute('aria-valuenow',String(Math.round(progress*100)));
    bar.querySelectorAll('i').forEach((segment,i)=>segment.classList.toggle('filled',progress>=(i+1)/5-.001));
    if(this.assetReady&&p.ready&&this.pageReady&&this.fontProgress===1&&this.displayed.every(x=>x>=1)&&this.readyAt===null){
      this.readyAt=elapsed;
    }
    let f=entranceFrame(elapsed,this.readyAt,reduced,this.permissionPending);
    if(f.phase==='exit'&&!this.permissionHandled){
      this.permissionHandled=true;
      if(!reduced&&matchMedia('(max-width:640px), (hover:none) and (pointer:coarse) and (max-height:640px)').matches&&isSecureContext&&window.DeviceOrientationEvent){
        this.askTiltPermission();
        f=entranceFrame(elapsed,this.readyAt,reduced,true);
      }
    }
    this.el.dataset.phase=f.phase;this.el.style.opacity=f.opacity;
    if(f.done){this.finish();return;}
    if(!document.hidden&&!this.permissionPending)p.frame=requestAnimationFrame(t=>p.tick(t));
  }
  askTiltPermission(){
    this.permissionPending=true;
    // Loading is complete. User choice must not be bypassed by a boot watchdog.
    clearTimeout(this.watchdog);clearTimeout(window.portfolioBootTimeout);
    // Try the native prompt directly. Safari may require the next real touch;
    // in that case reveal the page and arm one gesture, with no custom prompt UI.
    this.p.requestTiltOnEntry().finally(()=>{
      if(!this.active)return;
      this.permissionPending=false;
      this.readyAt=(performance.now()-this.started)/1000;
      this.p.wake();
    });
  }

  finish(){
    if(!this.active)return;
    this.active=false;clearTimeout(this.watchdog);clearTimeout(window.portfolioBootTimeout);
    const p=this.p;
    if(p.character){p.character.root.visible=p.ready;p.character.interruptIdle();}
    for(const part of [p.cord?.mesh,p.cord?.knot,p.cord?.tail,p.attachmentEye])if(part)part.visible=true;
    // Hold the device invisible across the loader's final painted frame.
    if(p.overlay)p.overlay.layer.style.opacity='0';
    if(p.hitSurface)p.hitSurface.hidden=true;
    document.querySelector('.layout').inert=false;
    document.body.style.overflow=this.previousOverflow||'';
    if(this.mounted)p.overlay?.attach();
    document.documentElement.classList.remove('is-loading');this.el.remove();
    if(!p.failed){
      p.arrival={offset:0,velocity:0};p.state.angle=0;p.state.velocity=0;
      p.motion.twist.angle=0;p.motion.twist.velocity=0;p.snapCord=true;p.resize();
      if(this.mounted){
        p.pivot.position.set(0,3.6,0);p.pivot.rotation.set(0,0,0);p.body.position.set(0,-3.7,0);p.body.rotation.set(0,0,0);
        p.scene.updateMatrixWorld();p.cord.update(1/60,false,0,true,0);p.renderer.render(p.scene,p.camera);
      }
      // Reveal the page first, then lower the whole device and cord from above the viewport.
      // Animate the composited layer so the warmed camera/physics cannot jump on entry.
      const frames=p.reduced.matches?[{opacity:0},{opacity:1}]:[
        {opacity:1,transform:'translateY(-100%)',offset:0,easing:'cubic-bezier(.42,0,.9,.65)'},
        {opacity:1,transform:'translateY(0)',offset:1}
      ];
      const reveal=p.overlay.layer.animate(frames,{delay:400,duration:p.reduced.matches?120:780,fill:'both'});
      reveal.finished.then(()=>{
        p.overlay.layer.style.removeProperty('opacity');reveal.cancel();
        // Transfer the fall into the existing rope spring instead of ending motion at rest.
        if(!p.reduced.matches)landingImpulse(p.motion);
        p.hitSurface.hidden=false;p.wake();
      }).catch(()=>{});
    }else if(p.hitSurface)p.hitSurface.hidden=false;
    for(const element of document.querySelectorAll('.layout,.theme-switch,.mobile-topbar')){
      element.animate([{opacity:0},{opacity:1}],{duration:p.reduced.matches?0:300,easing:'ease-out'});
    }
  }
}
