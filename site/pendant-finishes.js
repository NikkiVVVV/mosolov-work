import * as THREE from './vendor/three.module.js';

export const finishes = [
  {id:'frosted-glass',ru:'Чёрное матовое стекло',en:'Matte black glass'},
  {id:'acid-green',ru:'Кислотный зелёный',en:'Acid green'},
  {id:'#afb3b8',ru:'Серебро',en:'Silver'},
  {id:'pink-cheetah',ru:'Розовый гепард',en:'Pink cheetah'},
];

export function createCaseFinishes(body) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#d577a5';ctx.fillRect(0,0,512,512);
  let seed=91;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  // Small irregular solid spots, rather than leopard rosettes.
  for(let row=0;row<7;row++)for(let col=0;col<7;col++){
    const x=col*73+18+random()*37,y=row*73+18+random()*37;
    const radius=11+random()*12;
    ctx.fillStyle=random()>.2?'#462536':'#843b5b';ctx.beginPath();
    for(let i=0;i<9;i++){
      const angle=i/9*Math.PI*2,r=radius*(.7+random()*.5);
      const px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r*.8;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.fill();
  }
  const spots=new THREE.CanvasTexture(canvas);spots.colorSpace=THREE.SRGBColorSpace;
  spots.wrapS=spots.wrapT=THREE.RepeatWrapping;spots.repeat.set(.35,.35);
  spots.anisotropy=4;

  // Fine-print marking sits on the flat rear surface, facing outwards only.
  const markingCanvas=document.createElement('canvas');
  markingCanvas.width=1024;markingCanvas.height=192;
  const markingContext=markingCanvas.getContext('2d');
  markingContext.fillStyle='#ffffff';markingContext.textAlign='center';
  markingContext.textBaseline='middle';
  const printLine=(text,y,size,weight,spacing)=>{
    markingContext.font=`${weight} ${size}px Arial, sans-serif`;
    const widths=[...text].map(letter=>markingContext.measureText(letter).width);
    let x=(1024-widths.reduce((sum,width)=>sum+width,0)-spacing*(text.length-1))/2;
    [...text].forEach((letter,index)=>{
      markingContext.fillText(letter,x+widths[index]/2,y);
      x+=widths[index]+spacing;
    });
  };
  printLine('HUMAN INSIDE',54,64,500,8);
  printLine('DO NOT SHAKE THE DESIGNER',132,52,400,2);
  const markingTexture=new THREE.CanvasTexture(markingCanvas);
  markingTexture.colorSpace=THREE.SRGBColorSpace;markingTexture.anisotropy=4;
  const markingMaterial=new THREE.MeshBasicMaterial({
    map:markingTexture,transparent:true,depthWrite:false,toneMapped:false,
  });
  const marking=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.4125),markingMaterial);
  marking.position.set(0,-1.02,-.492);marking.rotation.y=Math.PI;
  body.add(marking);

  const internals=new THREE.Group();internals.visible=false;body.add(internals);
  const board=new THREE.MeshStandardMaterial({color:'#717171',roughness:.65,metalness:.25});
  const chip=new THREE.MeshStandardMaterial({color:'#252525',roughness:.6,metalness:.2});
  const metal=new THREE.MeshStandardMaterial({color:'#c6cdcc',roughness:.4,metalness:.8});
  const gold=new THREE.MeshStandardMaterial({color:'#c9b98b',roughness:.5,metalness:.7});
  const box=(w,h,d,x,y,z,material)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);internals.add(mesh);return mesh;
  };
  box(2.12,2.26,.045,0,0,-.19,board);
  box(.82,1.36,.12,.48,-.1,-.285,metal);
  box(.66,.62,.12,-.49,.57,-.285,chip);
  box(.48,.35,.08,-.55,-.48,-.27,chip);
  for(let i=0;i<7;i++){
    box(.045,.11,.018,-.76+i*.09,.92,-.275,gold);
    box(.045,.11,.018,-.76+i*.09,.21,-.275,gold);
  }
  for(let i=0;i<5;i++){
    box(.035,.72+i*.09,.012,-.93+i*.08,-.26,-.222,gold);
    box(.64,.028,.012,-.38,-.88+i*.055,-.222,gold);
  }
  for(const x of [-.92,.92])for(const y of [-1,1]){
    const screw=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.028,16),metal);
    screw.rotation.x=Math.PI/2;screw.position.set(x,y,-.235);internals.add(screw);
  }
  return {
    setShape(id,scale){
      internals.scale.set(scale,scale,1);
      marking.scale.set(id==='star'?.7:id==='round'?.85:1,id==='star'?.7:id==='round'?.85:1,1);
      marking.position.y=id==='star'?-.65:id==='round'?-.96:-1.02;
    },
    apply(id,caseMaterial,bezelMaterial){
      const glass=id==='frosted-glass',pattern=id==='pink-cheetah',acid=id==='acid-green';
      internals.visible=glass;
      markingMaterial.color.set(glass?'#c4c7c9':pattern?'#331c29':'#42494c');
      for(const material of [caseMaterial,bezelMaterial]){
        material.map=pattern?spots:null;
        material.color.set(glass?'#151515':pattern?'#ffffff':acid?'#40ff00':id);
        // Smoked shell reveals the opaque electronics without a milky refraction pass.
        material.transparent=glass;material.opacity=glass?.42:1;material.depthWrite=!glass;
        material.metalness=glass?0:pattern?.12:acid?.65:.8;
        material.roughness=glass?.18:pattern?.48:acid?.22:.27;
        material.iridescence=acid?.5:0;
        material.iridescenceIOR=1.3;
        material.iridescenceThicknessRange=[160,300];
        material.emissive.set(acid?'#69a800':'#000000');
        material.emissiveIntensity=acid?.08:0;
        material.transmission=0;
        material.thickness=glass?.08:0;
        material.attenuationColor.set(glass?'#707070':'#ffffff');
        material.attenuationDistance=glass?3:Infinity;
        material.ior=1.4;material.envMapIntensity=glass?.3:acid?.7:1;
        material.needsUpdate=true;
      }
    },
  };
}
