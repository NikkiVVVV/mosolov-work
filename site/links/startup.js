const intro=document.querySelector('#startup');
const phrase=intro?.querySelector('.startup-copy');
if(intro && phrase){
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const fonts=document.fonts ? Promise.all([
    document.fonts.load('400 16px "Golos Text"'),
    document.fonts.load('500 48px "Golos Text"'),
  ]).catch(()=>{}) : Promise.resolve();
  Promise.all([delay(3000),Promise.race([fonts,delay(3000)])]).finally(()=>{
    document.documentElement.classList.remove('startup-pending');
    setTimeout(()=>intro.remove(),320);
  });
}
