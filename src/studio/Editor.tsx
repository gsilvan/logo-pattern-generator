import { useEffect, useRef } from 'react';
import { Canvas as FabricCanvas, FabricImage, ActiveSelection } from 'fabric';
import { useStudio } from './store';
import { loadImage } from './render';
import type { Project } from './model';
const EDIT_SIZE = 520;
export function Editor(){
  const el=useRef<HTMLCanvasElement>(null), fabric=useRef<FabricCanvas|null>(null);
  const project=useStudio(s=>s.project), update=useStudio(s=>s.update), select=useStudio(s=>s.select), selectMany=useStudio(s=>s.selectMany), selectedIds=useStudio(s=>s.selectedIds);
  const updating=useRef(false);
  useEffect(()=>{
    if(!el.current)return;
    const canvas=new FabricCanvas(el.current,{width:EDIT_SIZE,height:EDIT_SIZE,selection:true,preserveObjectStacking:true});
    fabric.current=canvas;
    const changed=(event:{target?:any})=>{
      if(updating.current||!event.target)return;
      const targets=event.target instanceof ActiveSelection?event.target.getObjects():[event.target];
      const current=useStudio.getState().project;
      const sx=canvas.width/current.tileWidthMm,sy=canvas.height/current.tileHeightMm;
      const changed=new Map<string,Partial<Project['motifs'][number]>>();
      for(const t of targets){if(!t.studioId)continue;const center=t.getCenterPoint(),scale=t.getObjectScaling();changed.set(t.studioId,{xMm:center.x/sx,yMm:center.y/sy,widthMm:t.width*scale.x/sx,heightMm:t.height*scale.y/sy,rotation:t.getTotalAngle()});}
      if(changed.size)update(p=>({...p,motifs:p.motifs.map(m=>changed.has(m.id)?{...m,...changed.get(m.id)}:m)}));
    };
    const selection=()=>{
      if(updating.current)return;
      let ids=canvas.getActiveObjects().map((x:any)=>x.studioId).filter(Boolean) as string[];
      if(ids.length===1){const p=useStudio.getState().project,g=p.motifs.find(m=>m.id===ids[0])?.groupId;if(g)ids=p.motifs.filter(m=>m.groupId===g).map(m=>m.id);}
      selectMany(ids);
    };
    canvas.on('object:modified',changed);canvas.on('selection:created',selection);canvas.on('selection:updated',selection);canvas.on('selection:cleared',()=>{if(!updating.current)select(null);});
    return()=>{void canvas.dispose();fabric.current=null;};
  },[]);
  useEffect(()=>{
    const canvas=fabric.current;if(!canvas)return;
    let active=true;
    async function sync(p:Project){
      if(!canvas)return;
      const scale=Math.min(EDIT_SIZE/p.tileWidthMm,EDIT_SIZE/p.tileHeightMm);
      const w=p.tileWidthMm*scale,h=p.tileHeightMm*scale;
      const objects:FabricImage[]=[];
      for(const m of p.motifs){
        if(!m.visible)continue;const a=p.assets.find(a=>a.id===m.assetId);if(!a)continue;
        const img=await loadImage(a);if(!active)return;
        const item=new FabricImage(img,{left:m.xMm*scale,top:m.yMm*scale,originX:'center',originY:'center',scaleX:m.widthMm*scale/img.width,scaleY:m.heightMm*scale/img.height,angle:m.rotation,opacity:m.opacity,selectable:!m.locked,lockMovementX:m.locked,lockMovementY:m.locked});
        (item as any).studioId=m.id;objects.push(item);
      }
      if(!active)return;
      updating.current=true;canvas.discardActiveObject();canvas.clear();canvas.setDimensions({width:w,height:h});canvas.backgroundColor=p.backgroundColor;
      const bg=p.assets.find(a=>a.id===p.backgroundAssetId);
      if(bg){const img=await loadImage(bg);if(!active)return;const item=new FabricImage(img,{left:0,top:0,scaleX:w/img.width,scaleY:h/img.height,selectable:false,evented:false});canvas.add(item);}
      for(const item of objects)canvas.add(item);
      const selected=objects.filter(x=>selectedIds.includes((x as any).studioId));
      if(selected.length>1)canvas.setActiveObject(new ActiveSelection(selected,{canvas}));
      else if(selected.length===1)canvas.setActiveObject(selected[0]);
      canvas.renderAll();updating.current=false;
    }
    void sync(project).catch(console.error);
    return()=>{active=false;};
  },[project,selectedIds]);
  return <div className="editorWrap"><canvas ref={el}/><div className="editorCaption">Kachel {project.tileWidthMm/10} × {project.tileHeightMm/10} cm · Objekte frei ziehen, drehen und skalieren</div></div>;
}
