/** `TrackerStatusReport` do contrato: resposta de `STATUS#` decodificada (campo ausente/ilegível = `null`). */
export interface TrackerStatusReport {
  batteryVolts: number | null;
  externalVolts: number | null;
  gprsOnline: boolean | null;
  csq: number | null;
  acc: boolean | null;
  gpsOn: boolean | null;
  relay: boolean | null;
  sleep: boolean | null;
}

const num = (v: string): number | null => {
  const m = /^(-?\d+(?:\.\d+)?)/.exec(v);
  return m ? Number(m[1]) : null;
};
const onOff = (v: string): boolean | null => {
  const u = v.toUpperCase();
  return u === 'ON' ? true : u === 'OFF' ? false : null;
};
const bit = (v: string): boolean | null => (v === '1' ? true : v === '0' ? false : null);

/** Ex.: `Battery:4.27V;Exvkk:12.38,0;GPRS:Offline;CSQ:18;ACC:ON;GPS:ON;Gid:11;Relay:1;Slp:0;`. Nada reconhecido → `null`. */
export function parseStatusReport(response: string): TrackerStatusReport | null {
  const report: TrackerStatusReport = { batteryVolts: null, externalVolts: null, gprsOnline: null, csq: null, acc: null, gpsOn: null, relay: null, sleep: null };
  let recognized = false;
  for (const part of (response ?? '').split(';')) {
    const i = part.indexOf(':');
    if (i === -1) continue;
    const key = part.slice(0, i).trim().toLowerCase();
    const value = part.slice(i + 1).trim();
    switch (key) {
      case 'battery': report.batteryVolts = num(value); break;
      case 'exvkk': report.externalVolts = num(value); break;
      case 'gprs': report.gprsOnline = value.toLowerCase() === 'online' ? true : value.toLowerCase() === 'offline' ? false : null; break;
      case 'csq': { const n = num(value); report.csq = n !== null && Number.isInteger(n) ? n : null; break; }
      case 'acc': report.acc = onOff(value); break;
      case 'gps': report.gpsOn = onOff(value); break;
      case 'relay': report.relay = bit(value); break;
      case 'slp': report.sleep = bit(value); break;
      default: continue;
    }
    recognized = true;
  }
  return recognized ? report : null;
}
