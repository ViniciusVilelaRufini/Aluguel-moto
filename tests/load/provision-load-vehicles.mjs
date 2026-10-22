// Cria (idempotente) as motos de carga VLT-1001…VLT-1500 / moto-1001…moto-1500 no banco do services/api/.env,
// espalhadas pela área de operação, para o k6-telemetry.js publicar telemetria de 500 rastreadores conhecidos.
//   node tests/load/provision-load-vehicles.mjs [quantidade=500]
import { prisma } from '../e2e/lib/harness.mjs';

const n = Number(process.argv[2] ?? 500);
const db = prisma();
const rows = [];
for (let i = 0; i < n; i++) {
  const num = 1001 + i;
  rows.push({
    code: `VLT-${num}`,
    thingName: `moto-${num}`,
    qrCode: `volti://v/VLT-${num}`,
    model: 'Volti S1',
    lat: -23.575 + (i % 25) * 0.0013,
    lng: -46.703 + Math.floor(i / 25) * 0.0025,
    batteryPct: 80,
  });
}
const res = await db.vehicle.createMany({ data: rows, skipDuplicates: true });
console.log(JSON.stringify({ msg: 'load_vehicles_ready', created: res.count, total: await db.vehicle.count({ where: { code: { startsWith: 'VLT-1' } } }) }));
await db.$disconnect();
