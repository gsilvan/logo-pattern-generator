import { useEffect, useRef, useState } from 'react';
import { Application, Texture, TilingSprite, Rectangle } from 'pixi.js';
import { useStudio } from './store';
import { renderTile, renderSheet } from './render';
export function Preview(){
  const host=useRef<HTMLDivElement>(null),appRef=useRef<Application|null>(null);
  const [ready,setReady]=useState(false), [fallback,setFallback]=useState(false);
  const [actual,setActual]=useState(false),[measured,setMeasured]=useState(10),actualRef=useRef<HTMLCanvasElement>(null);
  const fallbackRef=useRef<HTMLCanvasElement>(null);
  const project=useStudio(s=>s.project);
  useEffect(()=>{
    let cancelled=false;const app=new Application();
    void app.init({width:520,height:520,background:'#e6e4df',antialias:true,resolution:Math.min(devicePixelRatio||1,2)}).then(()=>{
      if(cancelled){app.destroy(true);return;} appRef.current=app;host.current?.appendChild(app.canvas);setReady(true);
    }).catch(()=>{if(!cancelled)setFallback(true);});
    return()=>{cancelled=true;if(appRef.current===app){appRef.current=null;app.destroy(true);}};
  },[]);
  useEffect(()=>{
    let cancelled=false,texture:Texture|undefined,sprite:TilingSprite|undefined;
    const timer=window.setTimeout(async()=>{
      const app=appRef.current;if(!app&&!fallback)return;
      const scale=Math.min(520/project.sheetWidthMm,520/project.sheetHeightMm);
      const width=project.sheetWidthMm*scale,height=project.sheetHeightMm*scale;
      const tile=await renderTile(project,Math.min(90,520*25.4/Math.max(project.tileWidthMm,project.tileHeightMm)));
      if(cancelled)return;
      if(fallback){const c=fallbackRef.current,ctx=c?.getContext('2d');if(!c||!ctx)return;c.width=520;c.height=520;ctx.clearRect(0,0,520,520);const tw=project.tileWidthMm*scale,th=project.tileHeightMm*scale;for(let y=(520-height)/2;y<(520+height)/2;y+=th)for(let x=(520-width)/2;x<(520+width)/2;x+=tw)ctx.drawImage(tile,x,y,tw,th);return;}
      if(!app)return;texture=Texture.from(tile);
      sprite=new TilingSprite({texture,width,height});
      sprite.tileScale.set(width/project.sheetWidthMm*project.tileWidthMm/tile.width,height/project.sheetHeightMm*project.tileHeightMm/tile.height);
      app.stage.removeChildren().forEach(child=>{if(child instanceof TilingSprite)child.texture.destroy(true);child.destroy();});
      app.stage.addChild(sprite);
      app.stage.position.set((520-width)/2,(520-height)/2);
      app.stage.hitArea=new Rectangle(0,0,width,height);
    },80);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[project,ready,fallback]);
  useEffect(()=>{if(!actual)return;let active=true;const timer=setTimeout(()=>{void renderSheet(project,96*10/measured).then(c=>{if(!active||!actualRef.current)return;const out=actualRef.current;out.width=c.width;out.height=c.height;out.getContext('2d')?.drawImage(c,0,0);}).catch(console.error);},120);return()=>{active=false;clearTimeout(timer);};},[actual,measured,project]);
  return <div className="previewWrap">
    <div className="previewModes"><button className={!actual?'modeActive':''} onClick={()=>setActual(false)}>Einpassen</button><button className={actual?'modeActive':''} onClick={()=>setActual(true)}>Ungefähre Originalgröße</button></div>
    <div ref={host} className="previewCanvas" style={{display:actual||fallback?'none':undefined}}/>
    <canvas ref={fallbackRef} style={{display:!actual&&fallback?'block':'none',maxWidth:'100%'}}/>
    {actual?<div className="actualScroll"><canvas ref={actualRef}/></div>:<><div className="ruler horizontal">0 ───── {project.sheetWidthMm/20} ───── {project.sheetWidthMm/10} cm</div><div className="ruler vertical">{project.sheetHeightMm/10} cm</div></>}
    <div className="previewCaption">Tuch {project.sheetWidthMm/10} × {project.sheetHeightMm/10} cm</div>
    {actual&&<div className="calibration"><div className="calibrationLine">10 cm Referenz</div><label>Gemessene Länge <input type="number" min="1" max="30" step="0.1" value={measured} onChange={e=>{const n=Number(e.target.value);if(n>=1&&n<=30)setMeasured(n);}}/> cm</label><small>Nach Browser-Zoom oder Bildschirmwechsel neu messen.</small></div>}
  </div>;
}
