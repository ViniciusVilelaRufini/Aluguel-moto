
const MAP_Z=15, MAP_CX=12137.1, MAP_CY=18592.6;
function MapView({ children, dim=false, offsetY=0 }) {
  const W=402, H=874, tiles=[];
  const cx=MAP_CX*256, cy=MAP_CY*256 + offsetY;
  for (let x=12135;x<=12139;x++) for (let y=18589;y<=18596;y++) {
    const l=x*256-cx+W/2, t=y*256-cy+H/2;
    if (l>-256&&l<W&&t>-256&&t<H) tiles.push(<img key={x+'-'+y} src={'https://tile.openstreetmap.org/'+MAP_Z+'/'+x+'/'+y+'.png'} width="256" height="256" draggable="false" style={{position:'absolute',left:l,top:t,display:'block',filter:'saturate(.55) brightness(1.06) contrast(.92)'}}/>);
  }
  return <div style={{position:'absolute',inset:0,overflow:'hidden',background:'var(--map-land)'}}>
    {tiles}
    {dim && <div style={{position:'absolute',inset:0,background:'rgba(255,255,255,.25)'}}/>}
    {children}
  </div>;
}
function Pin({ x, y, children }) { return <div style={{position:'absolute',left:x,top:y,transform:'translate(-50%,-100%)',zIndex:5}}>{children}</div>; }
function UserDot({ x, y, heading=false }) {
  const s=heading?34:20;
  return <div style={{position:'absolute',left:x,top:y,transform:'translate(-50%,-50%)',zIndex:6,animation:'vt-pop-in 500ms var(--ease-spring) 200ms both'}}>
    <div style={{position:'absolute',left:0,top:0,width:s,height:s,borderRadius:'50%',background:'var(--brand)',animation:'vt-pulse-ring 2.2s var(--ease-out) infinite'}}/>
    {!heading && <div style={{position:'absolute',left:-40,top:-80,width:80,height:80,background:'linear-gradient(to top, rgba(52,194,92,.35), rgba(52,194,92,0))',clipPath:'polygon(50% 100%, 0 0, 100% 0)'}}/>}
    {heading
      ? <div style={{position:'relative',width:34,height:34,borderRadius:'50%',background:'var(--brand)',border:'3px solid #fff',boxShadow:'var(--shadow-brand)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}><VDS.Icon name="Navigation2" size={16} style={{fill:'#fff'}}/></div>
      : <div style={{position:'relative',width:20,height:20,borderRadius:'50%',background:'var(--brand)',border:'4px solid #fff',boxShadow:'0 2px 6px rgba(21,24,26,.25)',boxSizing:'border-box'}}/>}
  </div>;
}
function Route({ points, color='var(--coral-500)' }) {
  return <svg style={{position:'absolute',inset:0,zIndex:4,pointerEvents:'none'}} width="402" height="874"><polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" style={{animation:'vt-draw 1.1s var(--ease-in-out) 300ms forwards'}}/></svg>;
}
Object.assign(window,{MapView,Pin,UserDot,Route});
