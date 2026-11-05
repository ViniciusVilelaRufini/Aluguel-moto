import { parseStatusReport } from './status-report';

describe('parseStatusReport', () => {
  it('decodifica a resposta do J16', () => {
    expect(parseStatusReport('Battery:4.27V;Exvkk:12.38,0;GPRS:Offline;CSQ:18;ACC:ON;GPS:ON;Gid:11;Relay:1;Slp:0;')).toEqual({
      batteryVolts: 4.27, externalVolts: 12.38, gprsOnline: false, csq: 18, acc: true, gpsOn: true, relay: true, sleep: false,
    });
  });
  it('GPRS:Online', () => {
    expect(parseStatusReport('GPRS:Online;CSQ:20;')).toMatchObject({ gprsOnline: true, csq: 20, batteryVolts: null, relay: null });
  });
  it('campo ilegível vira null', () => {
    expect(parseStatusReport('Battery:abc;CSQ:18;')).toMatchObject({ batteryVolts: null, csq: 18 });
  });
  it('resposta de outro comando → null', () => {
    expect(parseStatusReport('LastPosition! Lati:-23.5,Longi:-46.6;')).toBeNull();
    expect(parseStatusReport('')).toBeNull();
  });
});
