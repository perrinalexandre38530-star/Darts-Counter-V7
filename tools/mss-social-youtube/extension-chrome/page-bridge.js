// Transfert d'un fichier JPEG officiel au champ fichier déclenché par YouTube Studio.
// Le remplacement temporaire des méthodes du champ fichier est restauré après chaque transfert.
(() => {
  'use strict';
  if (window.__mssYtBridge) return;
  window.__mssYtBridge = true;
  const TAG = 'MSS_YOUTUBE_OFFICIAL_MEDIA_V1';
  let pending=null,timer=null,oldClick=null,oldShow=null;
  function reply(token,event,detail=''){window.postMessage({tag:TAG,token,event,detail},location.origin)}
  function reset(){
    if(oldClick){HTMLInputElement.prototype.click=oldClick;oldClick=null;}
    if(oldShow){HTMLInputElement.prototype.showPicker=oldShow;oldShow=null;}
    document.removeEventListener('click',capture,true);clearTimeout(timer);timer=null;pending=null;
  }
  function fileFromDataUrl(dataUrl,name){
    const match=/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if(!match)throw Error('Image JPEG officielle manquante ou format non conforme.');
    const raw=atob(match[1]);if(raw.length<100||raw.length>6*1024*1024)throw Error('Taille du fichier incorrecte.');
    const buffer=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)buffer[i]=raw.charCodeAt(i);
    return new File([buffer],name,{type:'image/jpeg',lastModified:Date.now()});
  }
  function transfer(el){
    if(!pending||el?.type!=='file')return false;
    if(pending.used)return true;
    const job=pending;job.used=true;
    try{
      const dt=new DataTransfer();dt.items.add(job.file);el.files=dt.files;
      el.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
      el.dispatchEvent(new Event('change',{bubbles:true,composed:true}));
      reply(job.token,'file-sent',job.kind);
    }catch(e){reply(job.token,'failure',e?.message||String(e));}
    finally{reset();}
    return true;
  }
  function capture(e){if(pending&&e.target?.type==='file'&&e.target?.tagName==='INPUT'){e.preventDefault();e.stopImmediatePropagation();transfer(e.target);}}
  function install(job){
    reset();pending=job;
    oldClick=HTMLInputElement.prototype.click;
    oldShow=HTMLInputElement.prototype.showPicker;
    HTMLInputElement.prototype.click=function(...args){if(this.type==='file'&&transfer(this))return;return Reflect.apply(oldClick,this,args)};
    if(typeof oldShow==='function')HTMLInputElement.prototype.showPicker=function(...args){if(this.type==='file'&&transfer(this))return;return Reflect.apply(oldShow,this,args)};
    document.addEventListener('click',capture,true);
    timer=setTimeout(()=>{reply(job.token,'failure','YouTube n’a pas déclenché de champ fichier.');reset();},11000);
  }
  window.addEventListener('message',ev=>{
    if(ev.source!==window||ev.origin!==location.origin||ev.data?.tag!==TAG)return;
    const {action,token,kind,filename,dataUrl}=ev.data;
    if(typeof token!=='string')return;
    if(action==='cancel'){if(pending?.token===token)reset();return;}
    if(action!=='prepare'||!['banner','avatar'].includes(kind))return;
    if(kind==='banner'&&filename!=='MSS_COUVERTURE_YOUTUBE_2048x1152.jpg'||kind==='avatar'&&filename!=='MSS_LOGO_OFFICIEL.jpg'){
      reply(token,'failure','Nom du fichier MSS inattendu.');return;
    }
    try{install({token,kind,file:fileFromDataUrl(dataUrl,filename),used:false});reply(token,'ready',kind)}
    catch(e){reply(token,'failure',e?.message||String(e));reset()}
  });
})();
