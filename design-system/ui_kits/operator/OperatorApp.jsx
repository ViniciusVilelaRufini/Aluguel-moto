
function OperatorApp(){
  const [task,setTask]=React.useState(null);
  const [done,setDone]=React.useState([]);
  return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 0'}}>
    <IOSDevice><div style={{position:'relative',height:'100%',overflow:'hidden',fontFamily:'var(--font-sans)',color:'var(--text-primary)'}}>
      {task ? <TaskDetail task={task} onBack={()=>setTask(null)} onDone={t=>{setDone([...done,t.id]);setTask(null)}}/> : <TaskList done={done} onOpen={setTask}/>}
    </div></IOSDevice>
  </div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<OperatorApp/>);
