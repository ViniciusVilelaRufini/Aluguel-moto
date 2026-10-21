
function AdminMap({ children, zoom=15, cx=12137.1, cy=18592.6 }) {
  const ref=React.useRef(null);
  const [sz,setSz]=React.useState({w:900,h:700});
  React.useEffect(()=>{const ro=new ResizeObserver(([e])=>setSz({w:e.contentRect.width,h:e.contentRect.height}));ro.observe(ref.current);return()=>ro.disconnect()},[]);
  const tiles=[], px=cx*256, py=cy*256;
  for(let x=Math.floor(cx-sz.w/512)-1;x<=Math.ceil(cx+sz.w/512);x++)for(let y=Math.floor(cy-sz.h/512)-1;y<=Math.ceil(cy+sz.h/512);y++)
    tiles.push(<img key={x+'-'+y} src={'https://tile.openstreetmap.org/'+zoom+'/'+x+'/'+y+'.png'} width="256" height="256" draggable="false" style={{position:'absolute',left:x*256-px+sz.w/2,top:y*256-py+sz.h/2,filter:'saturate(.45) brightness(1.06) contrast(.9)'}}/>);
  return <div ref={ref} style={{position:'absolute',inset:0,overflow:'hidden',background:'var(--map-land)'}}>{tiles}<div style={{position:'absolute',inset:0}}>{children(sz)}</div></div>;
}
const FLEET=[
 {id:'VT-4821',st:'rented',bat:84,spd:22,x:-.12,y:-.18,last:'agora',sig:'4G forte',user:'Ana Lima'},
 {id:'VT-1077',st:'blocked',bat:52,spd:0,x:.18,y:.1,last:'2 min',sig:'4G fraco'},
 {id:'VT-3310',st:'offline',bat:12,spd:0,x:-.3,y:.22,last:'38 min',sig:'sem sinal'},
 {id:'VT-2209',st:'maintenance',bat:70,spd:0,x:.3,y:-.28,last:'agora',sig:'4G forte'},
 {id:'VT-0458',st:'free',bat:91,spd:0,x:-.02,y:.05,last:'agora',sig:'4G forte'},
 {id:'VT-0912',st:'free',bat:66,spd:0,x:.08,y:-.34,last:'1 min',sig:'4G forte'},
 {id:'VT-5530',st:'reserved',bat:77,spd:0,x:-.22,y:-.02,last:'agora',sig:'4G forte'},
 {id:'VT-6104',st:'paused',bat:45,spd:0,x:.24,y:.3,last:'agora',sig:'4G forte'},
 {id:'VT-7002',st:'rented',bat:58,spd:18,x:.36,y:-.06,last:'agora',sig:'4G forte'},
 {id:'VT-7190',st:'free',bat:88,spd:0,x:-.36,y:-.3,last:'agora',sig:'4G forte'},
];
function FleetPin({ v, selected, onClick }) {
  const c=VDS.FLEET_STATUS ? VDS.FLEET_STATUS[v.st][1] : 'var(--brand)';
  const s=selected?40:30;
  return <button onClick={onClick} title={v.id} style={{width:s,height:s,borderRadius:'50%',border:'3px solid #fff',background:c,color:'#fff',boxShadow:selected?'0 0 0 6px rgba(21,24,26,.15), var(--shadow-2)':'var(--shadow-1)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,transition:'all var(--dur-base) var(--ease-spring)'}}><VDS.Icon name="Bike" size={selected?18:14}/></button>;
}
Object.assign(window,{AdminMap,FLEET,FleetPin});
