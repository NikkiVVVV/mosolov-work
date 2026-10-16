/* AICSS G2 adapter for native DOM. Upstream: https://github.com/kvnkld/aicss
 * MIT License, Copyright (c) 2026 AICSS.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
export function g2Dots() {
  return [52,26,0,-26,-52].flatMap((lat,ring)=>Array.from({length:8},(_,j)=>{
    const latitude=lat*Math.PI/180,longitude=j/8*Math.PI*2,radius=8.5;
    const x= Math.cos(longitude)*Math.cos(latitude)*radius;
    const y= Math.sin(latitude)*radius;
    const z= Math.sin(longitude)*Math.cos(latitude)*radius;
    const tilt=14*Math.PI/180,dir=ring%2===1?-1:1;
    return Array.from({length:8},(_,k)=>{
      const spin=dir*k/8*Math.PI*2;
      const px=x*Math.cos(spin)-z*Math.sin(spin);
      const pz=x*Math.sin(spin)+z*Math.cos(spin);
      const py=y*Math.cos(tilt)-pz*Math.sin(tilt);
      const depth=y*Math.sin(tilt)+pz*Math.cos(tilt);
      const t=Math.max(0,Math.min(1,(depth/radius+.15)/1.15));
      return `--g${k}x:${px.toFixed(2)}px;--g${k}y:${(-py).toFixed(2)}px;--g${k}o:${(.12+.88*t*t).toFixed(3)}`;
    }).join(';');
  }));
}
export function initSearchG2() {
  const star=document.querySelector('#search-form > .search-spark');
  if(!star)return;
  const glyph=document.createElement('span');glyph.className='search-g2';glyph.dataset.variant='G2';glyph.setAttribute('aria-hidden','true');
  glyph.innerHTML=`<span class="search-g2-stage">${g2Dots().map(style=>`<i class="search-g2-dot" style="${style}"></i>`).join('')}</span>`;
  star.replaceWith(glyph);
}
