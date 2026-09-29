import type { Project, Asset } from './model';
import { mmToPx } from './model';
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const templateCache = new Map<string, Promise<HTMLImageElement>>();
function loadTemplate(path:string):Promise<HTMLImageElement>{let pending=templateCache.get(path);if(!pending){pending=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Banderolen-Vorlage fehlt.'));img.src=`${import.meta.env.BASE_URL}${path}`;});templateCache.set(path,pending);}return pending;}
export function loadImage(asset: Asset): Promise<HTMLImageElement> {
  let pending = imageCache.get(asset.id);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden: ${asset.name}`));
      img.src = asset.dataUrl;
    });
    imageCache.set(asset.id, pending);
  }
  return pending;
}
export function makeCanvas(width: number, height: number): HTMLCanvasElement {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width * height > 100_000_000) throw new Error('Bildgröße überschreitet das Exportlimit.');
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  if (!canvas.getContext('2d')) throw new Error('Canvas ist auf diesem Gerät nicht verfügbar.');
  return canvas;
}
function assetFor(p: Project, id: string | null) { return p.assets.find(a => a.id === id); }
export async function renderTile(p: Project, ppi: number, transparent = false, signal?:AbortSignal): Promise<HTMLCanvasElement> {
  const w = mmToPx(p.tileWidthMm, ppi), h = mmToPx(p.tileHeightMm, ppi);
  const canvas = makeCanvas(w,h), ctx = canvas.getContext('2d')!;
  if (!transparent) { ctx.fillStyle = p.backgroundColor; ctx.fillRect(0,0,w,h); }
  const background = assetFor(p,p.backgroundAssetId);
  if (background) {
    const img = await loadImage(background);
    // The selected background fills one whole repeat tile.
    ctx.drawImage(img,0,0,w,h);
  }
  const scaleX = w/p.tileWidthMm, scaleY = h/p.tileHeightMm;
  for (const motif of p.motifs) {
    signal?.throwIfAborted();
    if (!motif.visible) continue;
    const a = assetFor(p,motif.assetId); if (!a) continue;
    const img = await loadImage(a);
    const x = motif.xMm*scaleX, y=motif.yMm*scaleY;
    const mw=motif.widthMm*scaleX, mh=motif.heightMm*scaleY;
    const radius = Math.hypot(mw,mh)/2;
    const minX = Math.floor((x-radius)/w), maxX = Math.ceil((x+radius)/w);
    const minY = Math.floor((y-radius)/h), maxY = Math.ceil((y+radius)/h);
    if((maxX-minX+1)*(maxY-minY+1)>1000)throw new Error(`Motiv ${motif.name} ist für diese Kachel zu groß.`);
    ctx.globalAlpha = motif.opacity;
    for (let dx=minX; dx<=maxX; dx++) for (let dy=minY; dy<=maxY; dy++) {
      ctx.save(); ctx.translate(x-dx*w,y-dy*h); ctx.rotate(motif.rotation*Math.PI/180);
      ctx.drawImage(img,-mw/2,-mh/2,mw,mh); ctx.restore();
    }
  }
  ctx.globalAlpha=1;
  return canvas;
}
export async function renderSheet(p: Project, ppi: number, signal?:AbortSignal): Promise<HTMLCanvasElement> {
  const w=mmToPx(p.sheetWidthMm,ppi),h=mmToPx(p.sheetHeightMm,ppi);
  const sheet=makeCanvas(w,h),ctx=sheet.getContext('2d')!;
  ctx.fillStyle=p.backgroundColor;ctx.fillRect(0,0,w,h);
  const tile=await renderTile(p,ppi,false,signal);
  for (let y=0;y<h;y+=tile.height) {signal?.throwIfAborted();for(let x=0;x<w;x+=tile.width) ctx.drawImage(tile,x,y);if(signal)await new Promise(resolve=>setTimeout(resolve,0));}
  return sheet;
}
function wrappedText(ctx: CanvasRenderingContext2D, text:string, x:number,y:number,maxWidth:number,lineHeight:number) {
  let line=''; for(const word of text.split(/\s+/)) { const test=line ? line+' '+word : word; if(ctx.measureText(test).width>maxWidth && line) {ctx.fillText(line,x,y);y+=lineHeight;line=word;} else line=test;} ctx.fillText(line,x,y); return y+lineHeight;
}
export async function renderPackaging(p:Project,kind:'front'|'back'|'band',ppi:number):Promise<HTMLCanvasElement>{
  const widthMm=kind==='band'?230:100, heightMm=kind==='band'?47:p.sheetHeightMm/2;
  const c=makeCanvas(mmToPx(widthMm,ppi),mmToPx(heightMm,ppi));const ctx=c.getContext('2d')!;
  const sx=c.width/widthMm,sy=c.height/heightMm;
  ctx.fillStyle=p.backgroundColor;ctx.fillRect(0,0,c.width,c.height);
  if(kind!=='band'){const tile=await renderTile(p,ppi);for(let y=0;y<c.height;y+=tile.height)for(let x=0;x<c.width;x+=tile.width)ctx.drawImage(tile,x,y);}
  ctx.save();ctx.scale(sx,sy);
  if(kind==='band'){const template=await loadTemplate('banderole/banderole.png');ctx.drawImage(template,0,0,widthMm,heightMm);}
  if(kind==='front'||kind==='band'){
    const areaX=kind==='band'?65:0,areaY=kind==='band'?0:(heightMm-47)/2;
    ctx.fillStyle='#fff';ctx.fillRect(areaX,areaY,100,47);
    const a=assetFor(p,p.packaging.logoAssetId);
    if(a){const img=await loadImage(a);const b=p.packaging;const aspect=img.height/img.width;ctx.save();ctx.translate(areaX+b.logoXMm,areaY+b.logoYMm-37);ctx.rotate(b.logoRotation*Math.PI/180);ctx.drawImage(img,-b.logoWidthMm/2,-b.logoWidthMm*aspect/2,b.logoWidthMm,b.logoWidthMm*aspect);ctx.restore();}
  }
  if(kind==='back'||kind==='band'){
    const b=p.packaging;
    const address=[b.company,b.street,`${b.zip} ${b.city}`].filter(Boolean).join(' · ');
    if(kind==='back'){
      const template=await loadTemplate('banderole/Banderole_Backside.svg');
      const y0=(heightMm-47)/2;ctx.drawImage(template,0,y0,100,47);
      ctx.fillStyle='#202b28';ctx.font='1.9px sans-serif';
      let y=y0+5;
      y=wrappedText(ctx,'Anleitung: Circa 1 Jahr wiederverwendbar. Kein rohes Fleisch oder rohen Fisch einwickeln.',70,y,27,2.55);
      y=wrappedText(ctx,'Reinigung: Unter kaltem Wasser abspülen. Nicht auf der Heizung trocknen.',70,y+1,27,2.55);
      wrappedText(ctx,`Inverkehrbringer: ${address}`,70,y+1,27,2.55);
    }else{
      ctx.fillStyle='#202b28';ctx.font='1.8px sans-serif';let y=5;
      y=wrappedText(ctx,'Anleitung: Circa 1 Jahr wiederverwendbar. Kein rohes Fleisch oder rohen Fisch einwickeln.',7,y,37,2.5);
      wrappedText(ctx,'Reinigung: Unter kaltem Wasser abspülen. Nicht auf der Heizung trocknen.',7,y+1,37,2.5);
      ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fillRect(169,3,52,38);
      ctx.fillStyle='#202b28';wrappedText(ctx,`Inverkehrbringer: ${address}`,171,6,48,2.7);
    }
  }
  ctx.restore();return c;
}
