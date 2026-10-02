// Low-cost inertial translation in scene units; no second cloth simulation.
export class SpaceFlight {
  constructor(){this.x=0;this.y=0;this.vx=0;this.vy=0;this.pointer=null;this.bounces=0;}
  enter(x,y){this.x=x;this.y=y;this.vx=.035;this.vy=.018;this.pointer=null;}
  begin(id,x,y,time){this.pointer={id,x,y,time,vx:0,vy:0};}
  move(id,x,y,time,pixelsPerUnit){
    const p=this.pointer;if(!p||p.id!==id)return;
    const dt=Math.max(.008,(time-p.time)/1000);
    const blend=1-Math.exp(-dt*18);
    p.vx+=((x-p.x)/pixelsPerUnit/dt-p.vx)*blend;
    p.vy+=(-(y-p.y)/pixelsPerUnit/dt-p.vy)*blend;
    const speed=Math.hypot(p.vx,p.vy),limit=1.25;
    if(speed>limit){p.vx*=limit/speed;p.vy*=limit/speed;}
    p.x=x;p.y=y;p.time=time;
  }
  release(id,time,cancelled=false){
    const p=this.pointer;if(!p||p.id!==id)return;
    const fade=cancelled?0:Math.exp(-Math.max(0,time-p.time-90)/180);
    this.vx=p.vx*fade;this.vy=p.vy*fade;this.pointer=null;
  }
  step(dt,{left,right,bottom,top}){
    if(this.pointer)return;
    this.x+=this.vx*dt;this.y+=this.vy*dt;
    if(left>right){this.x=(left+right)/2;this.vx=0;}
    else if(this.x<left){this.x=left;if(this.vx<0){this.vx=-this.vx*.82;this.bounces++;}}
    else if(this.x>right){this.x=right;if(this.vx>0){this.vx=-this.vx*.82;this.bounces++;}}
    if(bottom>top){this.y=(bottom+top)/2;this.vy=0;}
    else if(this.y<bottom){this.y=bottom;if(this.vy<0){this.vy=-this.vy*.82;this.bounces++;}}
    else if(this.y>top){this.y=top;if(this.vy>0){this.vy=-this.vy*.82;this.bounces++;}}
    const drag=Math.exp(-dt*.055);this.vx*=drag;this.vy*=drag;
  }
}
