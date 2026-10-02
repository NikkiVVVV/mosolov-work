// A single low-frequency timer; hidden/offscreen scenes and active grabs do no work.
export class SceneCycle {
  constructor({advance,canAdvance=()=>true,delay=5000,schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}) {
    Object.assign(this,{advance,canAdvance,delay,schedule,cancel});
    this.enabled=false;this.timer=null;this.version=0;
  }
  setEnabled(enabled) {
    if(this.enabled===enabled)return;
    this.enabled=enabled;this.version++;
    if(this.timer!==null)this.cancel(this.timer);
    this.timer=null;
    if(enabled)this.queue(this.version);
  }
  queue(version,delay=this.delay) {
    this.timer=this.schedule(async()=>{
      this.timer=null;
      if(!this.enabled||version!==this.version)return;
      if(!this.canAdvance()){this.queue(version,250);return;}
      try{await this.advance();}
      finally{if(this.enabled&&version===this.version)this.queue(version);}
    },delay);
  }
}
