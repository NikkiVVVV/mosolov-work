// Native navigation preserves browser history and cached page state.
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href]');
 if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank')return;
 const url=new URL(link.href,location.href);
 if(url.origin!==location.origin)return;
 if(location.pathname==='/'&&url.pathname==='/links/'){
  try{sessionStorage.setItem('portfolio:return','true');sessionStorage.setItem('portfolio:links-from-home','true');}catch{}
 }
 if(location.pathname==='/links/'&&url.pathname==='/'){
  try{
   sessionStorage.setItem('portfolio:return','true');
   if(sessionStorage.getItem('portfolio:links-from-home')==='true'&&document.referrer&&new URL(document.referrer).origin===location.origin&&new URL(document.referrer).pathname==='/'){
    sessionStorage.removeItem('portfolio:links-from-home');event.preventDefault();history.back();
   }
  }catch{}
 }
});
