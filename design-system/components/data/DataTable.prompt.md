Tabular list for motos, clientes, alertas, log de auditoria.
```jsx
<DataTable columns={[{key:'id',label:'Moto',mono:true},{key:'st',label:'Status',render:r=><FleetStatus status={r.st} variant="dot"/>}]} rows={rows} onRowClick={open} />
```
Header on ink-50; selected row green-soft; IDs in mono.
