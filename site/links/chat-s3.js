/* AICSS S3 native DOM adapter. Copyright (c) 2026 AICSS, MIT.
 * Full MIT permission and warranty notice distributed in search-g2.js.
 * Source: https://github.com/kvnkld/aicss/tree/main/packages/react/src/orbs
 */
export function chatS3(variant='S3') {
 const ring=[[0,0],[1,0],[2,0],[2,1],[2,2],[1,2],[0,2],[0,1]];
 const cells=Array.from({length:9},(_,i)=>{
  const x=i%3,y=Math.floor(i/3),index=ring.findIndex(([rx,ry])=>rx===x&&ry===y);
  const delay=variant==='S2'?((x+y)/4)*1500:index<0?0:-(((8-index)%8)/8)*1700;
  return `<i class="chat-s3-cell${variant==='S3'&&index<0?' is-center':''}" style="left:${x*6}px;top:${y*6}px;animation-delay:${delay}ms"></i>`;
 }).join('');
 return `<span class="reply-orb chat-s3" data-variant="${variant}" aria-hidden="true"><span class="chat-s3-grid">${cells}</span></span>`;
}
export function initChatS3(){
 const star=document.querySelector('.chat-modal-header .search-spark');
 if(star)star.outerHTML=chatS3();
 const g2=document.querySelector('#search-form .search-g2');
 if(g2)g2.insertAdjacentHTML('afterend',chatS3());
}
