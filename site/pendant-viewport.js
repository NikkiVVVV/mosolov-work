// Keep the mobile canvas in document coordinates: scrolling then belongs to the
// browser compositor, without resizing WebGL or stretching it with browser chrome.
export class PendantViewport {
  constructor(renderer,layer){this.renderer=renderer;this.layer=layer;this.width=0;this.height=0;this.mobile=null;this.allocations=0;}
  sync({width,height,screenHeight,mobile,dialog,scrollX=0,scrollY=0},rect){
    const documentSpace=mobile&&!dialog;
    const nextHeight=documentSpace&&this.mobile===true&&this.width===width?this.height:
      documentSpace?Math.max(height,Math.min(screenHeight,height+160)):height;
    const pixelRatio=mobile?1.25:1.5;
    const ratio=Math.min(globalThis.devicePixelRatio||1,pixelRatio);
    if(this.ratio!==ratio){this.renderer.setPixelRatio(ratio);this.ratio=ratio;}
    if(this.width!==width||this.height!==nextHeight){
      this.renderer.setSize(width,nextHeight,false);this.width=width;this.height=nextHeight;
      this.layer.dataset.bufferResizes=String(++this.allocations);
    }
    this.mobile=documentSpace;
    Object.assign(this.layer.style,{position:documentSpace?'absolute':'fixed',inset:'auto',left:'0px',top:'0px',width:`${width}px`,height:`${nextHeight}px`});
    Object.assign(this.renderer.domElement.style,{width:`${width}px`,height:`${nextHeight}px`});
    return {width,height:nextHeight,left:rect.left+(documentSpace?scrollX:0),top:rect.top+(documentSpace?scrollY:0),documentSpace};
  }
}

export function touchIntent(dx,dy){
  if(Math.hypot(dx,dy)<8)return 'pending';
  return 'drag';
}
