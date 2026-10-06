// A fixed-size formation keeps mobile and desktop gameplay identical.
export const TOKEN_COLUMNS=11;
export const TOKEN_ROWS=5;
export function createTokens(wave=0){
  return Array.from({length:TOKEN_COLUMNS*TOKEN_ROWS},(_,i)=>{
    const col=i%TOKEN_COLUMNS,row=Math.floor(i/TOKEN_COLUMNS);
    const hp=1+((col*3+row*5+wave)%4);
    return {col,row,hp,value:hp*128,flash:0};
  });
}
export function hitToken(token){
  if(token.hp<=0)return 0;
  token.hp--;token.flash=.09;
  return token.hp===0?token.value:0;
}
export function strikeTokens(bullet,tokens,geometry){
  // Travel upward: resolve the nearest block first, including swept collisions.
  const candidates=tokens.filter(t=>t.hp>0).map(token=>({token,...geometry(token)}))
    .filter(t=>Math.abs(bullet.x-t.x)<=t.size/2+1&&bullet.y<=t.y+t.size&&bullet.previousY+8>=t.y)
    .sort((a,b)=>b.y-a.y);
  if(!candidates.length)return null;
  const target=candidates[0];
  return {...target,points:hitToken(target.token)};
}

export function roundOutcome(tokens,geometry,bottom){
  const remaining=tokens.filter(t=>t.hp>0);
  if(!remaining.length)return 'won';
  return remaining.some(t=>{const g=geometry(t);return g.y+g.size>=bottom;})?'lost':null;
}
