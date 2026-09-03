import React from "react";
import { pickRunningText as pickText, runningMercatorPixel as mercatorPixel, runningMercatorLatLon as mercatorLatLon } from "../../activity/runningShared";
import { haversineMeters } from "../../activity/activityMath";
import type { GeoPoint } from "../../activity/activityTypes";
import { analyzeRunningTerrain } from "../../activity/runningElevation";
import { buildRunningActivityAnalytics } from "../../activity/runningActivityAnalytics";
import { loadRunningMapTheme, runningMapRasterFilter, runningMapRasterTileUrl } from "./runningMapTheme";
import "./runningResponsive.css";

type Props = {
  points: GeoPoint[];
  accent: string;
  lang: string;
  textSoft?: string;
  height?: string | number;
  fullscreen?: boolean;
  activePointIndex?: number | null;
  onActivePointChange?: (index: number | null) => void;
};

type Viewport = { lat: number; lon: number; zoom: number };
type Size = { width: number; height: number };
type Point2 = { x: number; y: number };
const TILE = 256;

function pointDistance(a: Point2, b: Point2) { return Math.hypot(a.x - b.x, a.y - b.y); }
function fitViewport(points: GeoPoint[], width: number, height: number): Viewport {
  if (!points.length) return { lat: 0, lon: 0, zoom: 4 };
  const lats = points.map((p) => p.lat), lons = points.map((p) => p.lon);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2, lon = (Math.min(...lons) + Math.max(...lons)) / 2;
  let zoom = 17;
  for (let z = 17; z >= 3; z -= 1) {
    const px = points.map((p) => mercatorPixel(p.lat, p.lon, z));
    const xs = px.map((p) => p.x), ys = px.map((p) => p.y);
    if (Math.max(...xs) - Math.min(...xs) <= width * .72 && Math.max(...ys) - Math.min(...ys) <= height * .58) { zoom = z; break; }
  }
  return { lat, lon, zoom };
}
function cumulative(points: GeoPoint[]) { const out = new Array(points.length).fill(0); for (let i=1;i<points.length;i++) out[i]=out[i-1]+haversineMeters(points[i-1],points[i]); return out; }

export default function RunningTerrain3DCompat({ points, accent, lang, textSoft = "#a8a8b3", height = "clamp(320px,58svh,620px)", fullscreen = false, activePointIndex = null, onActivePointChange }: Props) {
  const safe = React.useMemo(() => points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)), [points]);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState<Size>({ width: 900, height: 560 });
  const [viewport, setViewport] = React.useState<Viewport>(() => fitViewport(safe, 900, 560));
  const pointerRef = React.useRef(new Map<number, Point2>());
  const dragRef = React.useRef<{ id:number; x:number; y:number; center:Point2; moved:boolean } | null>(null);
  const pinchRef = React.useRef<{ distance:number; zoom:number } | null>(null);
  const terrain = React.useMemo(() => analyzeRunningTerrain(safe), [safe]);
  const mapTheme = React.useMemo(() => loadRunningMapTheme(), []);
  const analytics = React.useMemo(() => buildRunningActivityAnalytics({ route: safe, distanceM: terrain.distanceM, movingMs: Number(safe[safe.length-1]?.elapsedMs || 0), elapsedMs: Number(safe[safe.length-1]?.elapsedMs || 0) } as any), [safe, terrain.distanceM]);
  const distances = React.useMemo(() => cumulative(safe), [safe]);

  React.useEffect(() => { setViewport(fitViewport(safe, Math.max(320,size.width), Math.max(260,size.height))); }, [safe, size.height, size.width]);
  React.useEffect(() => { const node=wrapRef.current; if(!node) return; const update=()=>{const r=node.getBoundingClientRect(); if(r.width>0&&r.height>0)setSize({width:r.width,height:r.height});}; update(); if(typeof ResizeObserver==="undefined") return; const ro=new ResizeObserver(update); ro.observe(node); return ()=>ro.disconnect(); },[]);

  const layout = React.useMemo(() => {
    const center=mercatorPixel(viewport.lat,viewport.lon,viewport.zoom); const width=Math.max(320,size.width), height=Math.max(260,size.height);
    const minX=Math.floor((center.x-width/2)/TILE)-1,maxX=Math.floor((center.x+width/2)/TILE)+1,minY=Math.floor((center.y-height/2)/TILE)-1,maxY=Math.floor((center.y+height/2)/TILE)+1,count=2**viewport.zoom;
    const tiles:Array<{key:string;left:number;top:number;url:string}>=[];
    for(let tx=minX;tx<=maxX;tx++) for(let ty=minY;ty<=maxY;ty++){if(ty<0||ty>=count)continue;const wx=((tx%count)+count)%count;tiles.push({key:`${viewport.zoom}-${tx}-${ty}`,left:tx*TILE-center.x+width/2,top:ty*TILE-center.y+height/2,url:runningMapRasterTileUrl(mapTheme, viewport.zoom, wx, ty)});}
    const screen=safe.map((p)=>{const w=mercatorPixel(p.lat,p.lon,viewport.zoom);return{x:w.x-center.x+width/2,y:w.y-center.y+height/2};});
    return {width,height,center,tiles,screen};
  },[mapTheme,safe,size.height,size.width,viewport]);

  const altitudes = terrain.samples.map((s)=>s.altitudeM); const minAlt=altitudes.length?Math.min(...altitudes):0,maxAlt=altitudes.length?Math.max(...altitudes):0;
  const altByIndex=React.useMemo(()=>{const m=new Map<number,number>();terrain.samples.forEach((s)=>m.set(s.index,s.altitudeM));return m;},[terrain.samples]);
  const elevated = React.useMemo(() => layout.screen.map((p,index)=>{const alt=altByIndex.get(index); const ratio=alt==null||maxAlt===minAlt?0:(alt-minAlt)/Math.max(1,maxAlt-minAlt); return {x:p.x,y:p.y-ratio*Math.min(88,layout.height*.16)};}),[altByIndex,layout.height,layout.screen,maxAlt,minAlt]);
  const routeArea = React.useMemo(()=>{if(elevated.length<2)return"";const top=elevated.map((p,i)=>`${i?"L":"M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");const base=layout.screen.slice().reverse().map((p)=>`L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");return `${top} ${base} Z`;},[elevated,layout.screen]);

  const setZoom=(zoom:number)=>setViewport((v)=>({...v,zoom:Math.max(3,Math.min(19,Math.round(zoom)))}));
  const down=(e:React.PointerEvent<HTMLDivElement>)=>{const pt={x:e.clientX,y:e.clientY};pointerRef.current.set(e.pointerId,pt);try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}if(pointerRef.current.size===1){dragRef.current={id:e.pointerId,x:e.clientX,y:e.clientY,center:mercatorPixel(viewport.lat,viewport.lon,viewport.zoom),moved:false};pinchRef.current=null;}else if(pointerRef.current.size===2){const ps=Array.from(pointerRef.current.values());pinchRef.current={distance:pointDistance(ps[0],ps[1]),zoom:viewport.zoom};dragRef.current=null;}};
  const move=(e:React.PointerEvent<HTMLDivElement>)=>{if(!pointerRef.current.has(e.pointerId))return;pointerRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointerRef.current.size>=2&&pinchRef.current){const ps=Array.from(pointerRef.current.values()),d=pointDistance(ps[0],ps[1]),ratio=d/Math.max(1,pinchRef.current.distance);if(ratio>1.22){setZoom(pinchRef.current.zoom+1);pinchRef.current={distance:d,zoom:Math.min(19,pinchRef.current.zoom+1)};}else if(ratio<.82){setZoom(pinchRef.current.zoom-1);pinchRef.current={distance:d,zoom:Math.max(3,pinchRef.current.zoom-1)};}return;}const dr=dragRef.current;if(!dr||dr.id!==e.pointerId)return;const dx=e.clientX-dr.x,dy=e.clientY-dr.y;if(Math.abs(dx)+Math.abs(dy)>5)dr.moved=true;const scaleX=layout.width/Math.max(1,size.width),scaleY=layout.height/Math.max(1,size.height);const geo=mercatorLatLon(dr.center.x-dx*scaleX,dr.center.y-dy*scaleY,viewport.zoom);setViewport((v)=>({...v,lat:geo.lat,lon:geo.lon}));};
  const up=(e:React.PointerEvent<HTMLDivElement>)=>{pointerRef.current.delete(e.pointerId);if(pointerRef.current.size<2)pinchRef.current=null;if(pointerRef.current.size===0)dragRef.current=null;};
  const wheel=(e:React.WheelEvent<HTMLDivElement>)=>{e.preventDefault();setZoom(viewport.zoom+(e.deltaY<0?1:-1));};
  const recenter=()=>setViewport(fitViewport(safe,Math.max(320,size.width),Math.max(260,size.height)));
  const active=activePointIndex==null?null:Math.max(0,Math.min(safe.length-1,activePointIndex));

  return <div ref={wrapRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel} style={{position:"relative",width:"100%",height:fullscreen?"100%":height,minHeight:fullscreen?0:300,overflow:"hidden",background:"linear-gradient(#0c1721,#071017)",touchAction:"none",userSelect:"none",cursor:"grab"}}>
    <div style={{position:"absolute",inset:"-12% -8% -2%",transform:"perspective(1050px) rotateX(48deg) scale(1.12)",transformOrigin:"50% 68%",filter:"saturate(.9) contrast(1.04)",overflow:"hidden"}}>
      {layout.tiles.map((tile)=><img key={tile.key} src={tile.url} alt="" draggable={false} style={{position:"absolute",left:tile.left,top:tile.top,width:TILE,height:TILE,filter:runningMapRasterFilter(mapTheme),userSelect:"none",pointerEvents:"none"}}/>)}
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible",pointerEvents:"none"}}>
        <path d={routeArea} fill={`${accent}20`} stroke="none"/>
        {layout.screen.map((base,index)=>index%Math.max(1,Math.floor(layout.screen.length/28))===0&&elevated[index]?<line key={`v${index}`} x1={base.x} y1={base.y} x2={elevated[index].x} y2={elevated[index].y} stroke={`${accent}38`} strokeWidth="1"/>:null)}
        {analytics.routeEdges.map((edge)=>{const a=elevated[edge.startIndex],b=elevated[edge.endIndex];return a&&b?<line key={`${edge.startIndex}-${edge.endIndex}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,0,0,.72)" strokeWidth="8" strokeLinecap="round"/>:null;})}
        {analytics.routeEdges.map((edge)=>{const a=elevated[edge.startIndex],b=elevated[edge.endIndex];return a&&b?<line key={`c${edge.startIndex}-${edge.endIndex}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={edge.color||accent} strokeWidth="4.4" strokeLinecap="round"/>:null;})}
        {analytics.routeEdges.length===0&&elevated.length>1?<polyline points={elevated.map((p)=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={accent} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>:null}
        {active!=null&&elevated[active]?<><line x1={layout.screen[active].x} y1={layout.screen[active].y} x2={elevated[active].x} y2={elevated[active].y} stroke="#fff" strokeWidth="1.2" strokeDasharray="4 3"/><circle cx={elevated[active].x} cy={elevated[active].y} r="7" fill={accent} stroke="#fff" strokeWidth="2"/></>:null}
      </svg>
    </div>
    <div style={{position:"absolute",left:10,top:10,zIndex:8,display:"flex",gap:6,alignItems:"center"}}><button className="btn" onPointerDown={(e)=>e.stopPropagation()} onClick={(e)=>{e.stopPropagation();recenter();}} style={{minWidth:38,minHeight:38,padding:0,background:"rgba(5,8,13,.88)"}}>◎</button><div style={{padding:"6px 9px",borderRadius:999,background:"rgba(5,8,13,.82)",border:`1px solid ${accent}42`,color:accent,fontSize:7.8,fontWeight:1000,backdropFilter:"blur(12px)"}}>3D · ALTITUDE GPS</div></div>
    <div style={{position:"absolute",left:10,right:10,bottom:fullscreen?"max(12px,env(safe-area-inset-bottom))":10,zIndex:8,display:"flex",justifyContent:"center",pointerEvents:"none"}}><div style={{padding:"6px 9px",borderRadius:999,background:"rgba(5,8,13,.80)",border:"1px solid rgba(255,255,255,.10)",color:textSoft,fontSize:7.2,backdropFilter:"blur(12px)"}}>{pickText(lang,"Glisser · pincer · molette · couleurs = performance locale","Drag · pinch · wheel · colours = local performance","Mover · pellizcar · rueda · colores = rendimiento local")}</div></div>
    {safe.length?<div style={{position:"absolute",right:10,top:10,zIndex:8,padding:"6px 8px",borderRadius:11,background:"rgba(5,8,13,.82)",border:"1px solid rgba(255,255,255,.10)",color:"#fff",fontSize:7.2}}>{(distances[distances.length-1]/1000).toFixed(2)} km · {terrain.maxAltitudeM==null?"—":`${Math.round(terrain.maxAltitudeM)} m`}</div>:null}
  </div>;
}
