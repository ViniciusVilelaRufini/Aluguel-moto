Status label for motos: Livre, Alugada, Reservada, Pausada, Bloqueada, Manutenção, Sem sinal.
```jsx
<FleetStatus status="rented" count={42} selected onClick={…} />
<FleetStatus status="blocked" variant="dot" />
```
Colors from `--status-*` tokens. Pill = map filter; dot = table cell.
