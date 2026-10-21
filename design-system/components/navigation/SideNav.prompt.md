Primary navigation for the admin web panel (Frota, Alertas, Cercas, Clientes, Financeiro).
```jsx
<SideNav items={[{value:'fleet',label:'Frota',icon:'Map'},{value:'alerts',label:'Alertas',icon:'Siren',badge:3}]} value={tab} onChange={setTab} />
```
Ink-900 background; active item gets 8% white fill + green icon.
