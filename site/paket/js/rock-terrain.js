function cap(x,y,cx,cy,rx,ry,h){
  const dx=Math.abs((x-cx)/rx),dy=Math.abs((y-cy)/ry);
  return Math.max(0,Math.min(1,1.16-Math.max(dx,dy,(dx+dy)*.72)))*h;
}
export function rockHeight(x,y,totalHeight=7.6,lowerHalf=4.7){
  const u=.18+(x/4+.5)*.64,v=.36+(y+lowerHalf)/totalHeight*.47;
  return -1.32+Math.max(
    cap(u,v,.33,.72,.17,.13,1.22),
    cap(u,v,.79,.78,.19,.15,1.11),
    cap(u,v,.83,.39,.25,.20,1.02),
    cap(u,v,.53,.62,.10,.08,.71)
  );
}

// The rendered triangles ARE the collider. One small cached heightfield, no raycast
// per cloth node, texture readback or allocations in the solver.
export class RockTerrain{
  constructor(columns=24,rows=40){
    this.columns=columns;this.rows=rows;
    this.positions=new Float32Array((columns+1)*(rows+1)*3);
    this.uv=new Float32Array((columns+1)*(rows+1)*2);
    this.indices=new Uint16Array(columns*rows*6);
    let k=0;
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
      const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;
      this.indices.set([a,b,c,b,d,c],k);k+=6;
    }
    this.update(4.48,.65,2.47);
  }
  update(height,top,bottom){
    const total=height+top+bottom,lower=height/2+bottom;
    if(this.total===total&&this.lower===lower)return false;
    this.total=total;this.lower=lower;
    for(let row=0;row<=this.rows;row++)for(let col=0;col<=this.columns;col++){
      const i=row*(this.columns+1)+col,u=col/this.columns,v=row/this.rows;
      const x=u*4-2,y=v*total-lower;
      this.positions.set([x,y,rockHeight(x,y,total,lower)],i*3);this.uv.set([u,v],i*2);
    }
    return true;
  }
  sample(x,y){
    const gx=Math.max(0,Math.min(this.columns-.000001,(x+2)/4*this.columns));
    const gy=Math.max(0,Math.min(this.rows-.000001,(y+this.lower)/this.total*this.rows));
    const col=Math.floor(gx),row=Math.floor(gy),fx=gx-col,fy=gy-row;
    const a=(row*(this.columns+1)+col)*3+2,b=a+3,c=a+(this.columns+1)*3,d=c+3,p=this.positions;
    return fx+fy<=1?p[a]+(p[b]-p[a])*fx+(p[c]-p[a])*fy:p[d]+(p[c]-p[d])*(1-fx)+(p[b]-p[d])*(1-fy);
  }
}
