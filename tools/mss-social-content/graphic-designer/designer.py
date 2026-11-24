#!/usr/bin/env python3
"""MSS: deterministic localized rendering, visual approval, fail-closed media selection."""
import argparse,hashlib,html,json,os,shutil,subprocess,sys
from pathlib import Path
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont,ImageOps,features
from fontTools.ttLib import TTFont
import qrcode,cv2
HERE=Path(__file__).resolve().parent; PACK=HERE.parent/'campaigns/v47-darts-scoring-ads'; OUT=HERE/'output'; ART=HERE/'art'
URL='https://play.google.com/store/apps/details?id=com.multisportsscoring.app'
IDS=['campaign_01','campaign_02','campaign_03']; W,H=1080,1350
GOLD='#FFD449'; CYAN='#40DDF4'; WHITE='#F1F5FF'; MUTED='#B8CADA'; PANEL='#0D2031'
def load(p,default=None):return json.loads(p.read_text(encoding='utf8')) if p.exists() else default
def dump(p,o):
 p.parent.mkdir(parents=True,exist_ok=True);t=p.with_suffix('.tmp');t.write_text(json.dumps(o,ensure_ascii=False,indent=2),encoding='utf8');t.replace(p)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
LANGS=load(PACK/'locales/index.json')['languages']; EXTRA=load(HERE/'copy-details.json')
@lru_cache(None)
def spec(lang):
 if not features.check('raqm'):raise RuntimeError('Pillow RAQM requis')
 k=lang if lang in ('ar','hi','ja','zh') else 'latin'; family={'ar':'DejaVu Sans','hi':'FreeSans','ja':'Noto Sans CJK JP','zh':'Noto Sans CJK SC'}.get(k,'Noto Sans');idx=0
 path=os.getenv('MSS_FONT_'+k.upper())
 if path:idx=int(os.getenv('MSS_FONT_INDEX_'+k.upper(),'0'))
 elif shutil.which('fc-match'):
  path,i=subprocess.check_output(['fc-match','-f','%{file}\n%{index}',family+':style=Bold'],text=True).splitlines();idx=int(i or '0')
 else:
  name={'ar':'DejaVuSans-Bold.ttf','hi':'FreeSansBold.ttf','ja':'NotoSansCJK-Bold.ttc','zh':'NotoSansCJK-Bold.ttc','latin':'NotoSans-Bold.ttf'}[k]
  paths=[Path(os.getenv('LOCALAPPDATA',''))/'Microsoft/Windows/Fonts'/name,Path(os.getenv('WINDIR','C:/Windows'))/'Fonts'/name]
  path=next((str(p) for p in paths if p.is_file()),None);idx=2 if k=='zh' else 0
 if not path:raise RuntimeError('Installer '+family+' ou définir MSS_FONT_'+k.upper())
 with TTFont(path,fontNumber=idx) as f: cmap=set(f.getBestCmap())
 return path,idx,cmap
@lru_cache(maxsize=256)
def font(lang,size):
 p,i,_=spec(lang);return ImageFont.truetype(p,size,index=i,layout_engine=ImageFont.Layout.RAQM)
def fit(d,text,box,lang,color=WHITE,maximum=38,minimum=17,center=False,limit=2):
 x,y,w,h=box;text=text.strip();opts={'direction':'rtl' if lang=='ar' else 'ltr','language':lang}
 if not text or {ord(c) for c in text if not c.isspace()}-spec(lang)[2]:raise ValueError('Glyphes manquants ou texte vide : '+text)
 for size in range(maximum,minimum-1,-1):
  f=font(lang,size);lines=[];line='';units=list(text) if lang in ('ja','zh') else text.split();sep='' if lang in ('ja','zh') else ' '
  for unit in units:
   s=line+sep+unit if line else unit
   if line and d.textlength(s,font=f,**opts)>w:lines.append(line);line=unit
   else:line=s
  if line:lines.append(line)
  boxes=[d.textbbox((0,0),s,font=f,**opts) for s in lines];hh=[b[3]-b[1] for b in boxes];gap=max(3,size//6);total=sum(hh)+gap*(len(lines)-1)
  if len(lines)>limit or total>h or any(b[2]-b[0]>w for b in boxes):continue
  yy=y+(h-total)//2
  for s,b,lh in zip(lines,boxes,hh):
   xx=x+(w-b[2]+b[0])//2 if center else (x+w-b[2]+b[0] if lang=='ar' else x)
   d.text((xx-b[0],yy-b[1]),s,font=f,fill=color,**opts);yy+=lh+gap
  return
 raise ValueError('Débordement : '+text)
def contain(im,path,box):
 x,y,w,h=box;obj=Image.open(path).convert('RGBA');obj.thumbnail((w,h),Image.Resampling.LANCZOS);im.paste(obj,(x+(w-obj.width)//2,y+(h-obj.height)//2),obj)
def photo(im,path,box):
 x,y,w,h=box;obj=ImageOps.fit(Image.open(path).convert('RGB'),(w,h));mask=Image.new('L',(w,h));ImageDraw.Draw(mask).rounded_rectangle((0,0,w-1,h-1),radius=18,fill=255);im.paste(obj,(x,y),mask)
def render(lang,cid):
 data=load(PACK/'locales'/f'{lang}.json');p=data['posters'];v=dict(p[cid]);ref=p['campaign_01']['feature_list'];r2=p['campaign_02']['feature_list'];extra=EXTRA[lang];idx=IDS.index(cid)+1
 override=load(HERE/'overrides'/lang/f'{cid}.json',{});v.update(override)
 # Separate real artwork, type and vector-inspired UI. No AI redrawing of logos or QR.
 import numpy as np
 yy,xx=np.mgrid[0:H,0:W]; rgb=np.zeros((H,W,3),dtype=np.float32);rgb[:]=[5,13,25]
 for cx,cy,radius,clr in [(900,110,480,(0,56,77)),(1000,800,420,(55,34,0)),(100,1000,440,(27,8,49)),(320,400,410,(0,18,29))]:
  glow=np.exp(-((xx-cx)**2+(yy-cy)**2)/(radius**2));rgb+=glow[:,:,None]*np.array(clr)
 im=Image.fromarray(np.uint8(np.clip(rgb,0,255)));d=ImageDraw.Draw(im)
 def panel(box,edge,fill='#0B1B2B',rad=18,width=2):
  x,y,w,h=box;d.rounded_rectangle((x,y,x+w-1,y+h-1),radius=rad,fill=fill,outline=edge,width=width)
 def glowbox(box,edge,fill='#0B1B2B',rad=18):
  from PIL import ImageFilter
  x,y,w,h=box;layer=Image.new('RGBA',im.size);ld=ImageDraw.Draw(layer);ld.rounded_rectangle((x,y,x+w-1,y+h-1),radius=rad,outline=edge,width=7);im.paste(layer.filter(ImageFilter.GaussianBlur(12)),(0,0),layer.filter(ImageFilter.GaussianBlur(12)));panel(box,edge,fill,rad,3)
 contain(im,ART/'mss.jpg',(36,16,153,140));contain(im,ART/'darts.webp',(900,19,140,140))
 fit(d,'MULTISPORTS SCORING',(198,24,695,35),'en',CYAN,26,22,True,1);fit(d,'DARTS SCORING',(198,60,695,59),'en',GOLD,53,40,True,1);fit(d,v['subtitle'],(202,123,686,42),lang,MUTED,23,15,True,2)
 d.line((40,177,1040,177),fill='#36627B',width=2)
 # Full-width hero with dark gradient for legible text, preserving original dart photography.
 x,y,w,h=40,193,1000,269
 hero=ImageOps.fit(Image.open(ART/f'hero-{idx}.jpg').convert('RGB'),(w,h),centering=(.6,.5));a=np.asarray(hero).astype(float);t=np.linspace(0,1,w);blend=np.clip((.68-t)/.53,0,1) if idx!=2 else np.clip((t-.32)/.53,0,1);a=a*(1-blend[None,:,None]*.93)+np.array([5,13,25])*blend[None,:,None]*.93;hero=Image.fromarray(a.astype('uint8'));mask=Image.new('L',(w,h));ImageDraw.Draw(mask).rounded_rectangle((0,0,w-1,h-1),radius=22,fill=255);im.paste(hero,(x,y),mask);d.rounded_rectangle((x,y,x+w-1,y+h-1),radius=22,outline=CYAN,width=2)
 if idx in (1,2):
  tx=66 if idx==1 else 542
  for i,s in enumerate(v['headline']):fit(d,s,(tx,218+i*74,472,70),lang,GOLD if i==2 else WHITE,55,26,False,2)
 else:
  contain(im,ART/'awena.webp',(54,200,200,252));fit(d,v['headline'][0],(264,216,490,141),lang,WHITE,54,25,True,3);fit(d,ref[9],(264,362,490,75),lang,GOLD,31,19,True,2)
 for bx,label,col,ic in [(40,r2[0],GOLD,'games-gold'),(548,r2[1],CYAN,'profiles-cyan')]:
  glowbox((bx,480,492,85),col);contain(im,ART/f'{ic}.png',(bx+16,493,58,58));fit(d,label,(bx+88,489,390,68),lang,col,47,24,True,2)
 fit(d,v['section_title'],(40,577,1000,44),lang,CYAN,28,17,True,2)
 tiles=[('agenda',ref[1],extra[0]),('stats',ref[2],extra[1]),('profiles',ref[3],None),('tournaments',ref[4],None),('cast_host',ref[5],None),('organization_teams',ref[6],extra[3]),('settings',ref[7],None),('games',extra[2],None)]
 if idx==2:tiles=[tiles[i] for i in (3,5,0,1,2,4,6,7)]
 if idx==3:tiles=[tiles[i] for i in (0,7,1,2,5,3,4,6)]
 for i,(ic,title,sub) in enumerate(tiles):
  x=40+(i%2)*508;y=632+(i//2)*91;col='gold' if i%3==0 else 'cyan';panel((x,y,492,83),'#397291',rad=14);contain(im,ART/f'{ic}-{col}.png',(x+12,y+13,56,56));d.line((x+77,y+15,x+77,y+68),fill=GOLD if col=='gold' else CYAN,width=2);fit(d,title,(x+88,y+4,393,43 if sub else 74),lang,WHITE,27,17,False,2)
  if sub:fit(d,sub,(x+88,y+48,393,30),lang,MUTED,19,13,False,2)
 glowbox((40,1002,1000,54),'#AB67FF','#16162F',14);fit(d,ref[9],(55,1007,970,44),lang,GOLD,30,18,True,2)
 # Official game tickers are language-neutral names, no French body copy.
 tickers=HERE.parents[2]/'src/assets/tickers'
 for i,n in enumerate(('ticker_x01.png','ticker_cricket.png','ticker_killer.png')):
  bx=40+i*338;panel((bx,1070,324,66),'#305E75',rad=10);contain(im,tickers/n,(bx+3,1073,318,60))
 q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=4,border=4);q.add_data(URL);q.make(fit=True);qr=q.make_image(fill_color='black',back_color='white').convert('RGB');s=qr.width;x=40+(170-s)//2;y=1153+(174-s)//2;panel((40,1153,170,174),GOLD,'white',16);im.paste(qr,(x,y))
 fit(d,v['cta'],(225,1156,815,52),lang,WHITE,39,22,True,2)
 for i,label in enumerate(data['stores']):
  bx=225+i*410;panel((bx,1211,400,58),'#B8CADA','#060C13',11);fit(d,label,(bx+8,1215,384,50),lang,WHITE,23,15,True,2)
 fit(d,' • '.join(data['footer']),(225,1277,815,42),lang,MUTED,21,14,True,2)
 path=OUT/lang/f'{cid}.png';path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix('.tmp.png');im.save(tmp,compress_level=4)
 arr=cv2.imread(str(tmp));decoded=cv2.QRCodeDetector().detectAndDecode(arr[y:y+s,x:x+s])[0]
 if decoded!=URL:tmp.unlink();raise ValueError('QR illisible')
 tmp.replace(path);caption=' • '.join([r2[0],r2[1],extra[0],extra[1],extra[2],extra[3],ref[9]])+'\n'+v['cta']+' : '+URL+'\n'+' '.join(v['hashtags'])
 return {'id':lang+'/'+cid,'locale':lang,'campaign':cid,'file':path.relative_to(OUT).as_posix(),'sha256':sha(path),'width':W,'height':H,'qr_url':URL,'qa':'PASS_LAYOUT_GLYPHS_QR','caption':caption,'template_version':2,'copy':{k:v[k] for k in ('headline','subtitle','cta')}}
def catalog():return load(OUT/'catalog.json',{'entries':[]})
def valid(e):
 p=OUT/e['file'];return p.is_file() and sha(p)==e['sha256'] and e.get('qa')=='PASS_LAYOUT_GLYPHS_QR' and e.get('template_version')==2
def eligible(e,a):return valid(e) and a.get(e['id'],{}).get('sha256')==e['sha256'] and a[e['id']].get('decision')=='approved'
def gallery():
 a=load(OUT/'approvals.json',{});blocks=[]
 for e in catalog()['entries']:
  status='VALIDÉ' if eligible(e,a) else 'À CONTRÔLER';img=html.escape(e['file']);id=html.escape(e['id']);blocks.append(f'<article data-lang="{e["locale"]}"><a href="{img}"><img loading="lazy" src="{img}" alt="{id}"></a><b>{id}</b><p>{status}</p><small>SHA : {e["sha256"]}</small></article>')
 (OUT/'gallery.html').write_text('''<!doctype html><meta charset="utf-8"><title>MSS Graphic Designer</title><style>body{background:#071522;color:#edf4ff;font:16px system-ui;margin:24px}h1{color:#ffd449}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px}article{background:#102536;border:1px solid #30516b;padding:12px;border-radius:12px}img{width:100%;display:block;margin-bottom:10px}small{overflow-wrap:anywhere}select{font:inherit;padding:8px}</style><h1>MSS GRAPHIC DESIGNER</h1><p>Galerie locale de contrôle • Cliquez pour agrandir. Validation via la commande approve.</p><label>Langue <select><option value="">Toutes</option>'''+''.join(f'<option>{l}</option>' for l in LANGS)+'''</select></label><main>'''+''.join(blocks)+'''</main><script>document.querySelector('select').onchange=e=>document.querySelectorAll('article').forEach(a=>a.hidden=!!e.target.value&&a.dataset.lang!==e.target.value)</script>''',encoding='utf8')
def main():
 a=argparse.ArgumentParser();sub=a.add_subparsers(dest='cmd',required=True);r=sub.add_parser('render');r.add_argument('--lang',choices=['all']+LANGS,default='all');r.add_argument('--campaign',choices=['all']+IDS,default='all')
 for cmd in ('approve','reject','select'):
  s=sub.add_parser(cmd);s.add_argument('locale',choices=LANGS);s.add_argument('campaign',choices=IDS)
  if cmd!='select':s.add_argument('--sha256',required=True)
 sub.add_parser('verify');sub.add_parser('gallery');args=a.parse_args();OUT.mkdir(exist_ok=True)
 if args.cmd=='render':
  entries={e['id']:e for e in catalog()['entries']};errors=[]
  for lang in LANGS if args.lang=='all' else [args.lang]:
   for cid in IDS if args.campaign=='all' else [args.campaign]:
    try:e=render(lang,cid);entries[e['id']]=e;print('PASS',e['id'],flush=True)
    except Exception as exc:errors.append({'id':lang+'/'+cid,'error':str(exc)});print('FAIL',errors[-1],flush=True)
  dump(OUT/'catalog.json',{'schema':'mss.graphic.catalog.v2','entries':sorted(entries.values(),key=lambda e:e['id']),'errors':errors,'publication':'manual_approval_required'});gallery();return int(bool(errors))
 if args.cmd=='gallery':gallery();return 0
 if args.cmd=='verify':
  es=catalog()['entries'];bad=[e['id'] for e in es if not valid(e)];missing=sorted({l+'/'+c for l in LANGS for c in IDS}-{e['id'] for e in es});print(json.dumps({'count':len(es),'invalid':bad,'missing':missing}));return int(bool(bad or missing))
 e=next((e for e in catalog()['entries'] if e['id']==args.locale+'/'+args.campaign),None)
 if not e or not valid(e):raise SystemExit('Média absent ou invalide')
 approvals=load(OUT/'approvals.json',{})
 if args.cmd=='select':
  if not eligible(e,approvals):raise SystemExit('Diffusion refusée : validation visuelle absente ou obsolète')
  print(json.dumps({**e,'absolute_path':str((OUT/e['file']).resolve())},ensure_ascii=False));return 0
 if args.sha256!=e['sha256']:raise SystemExit('Version différente de celle contrôlée')
 approvals[e['id']]={'decision':'approved' if args.cmd=='approve' else 'rejected','sha256':e['sha256']};dump(OUT/'approvals.json',approvals);gallery();print(args.cmd,e['id']);return 0
if __name__=='__main__':sys.exit(main())
