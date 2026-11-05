import { classifyConsoleText } from './console-policy';

describe('classifyConsoleText', () => {
  it('STATUS# é leitura', () => {
    expect(classifyConsoleText('STATUS#')).toEqual({ ok: true, text: 'STATUS#', keyword: 'STATUS', risk: 'read' });
  });
  it('status# em minúsculas: palavra-chave em maiúsculas, texto intacto', () => {
    expect(classifyConsoleText('status#')).toEqual({ ok: true, text: 'status#', keyword: 'STATUS', risk: 'read' });
  });
  it('APN com vírgula é conexão e não muda a caixa dos argumentos', () => {
    expect(classifyConsoleText('APN,indica.algar.br#')).toEqual({ ok: true, text: 'APN,indica.algar.br#', keyword: 'APN', risk: 'connection' });
  });
  it('SERVER com vírgula é conexão', () => {
    expect(classifyConsoleText('SERVER,1,api-volti-dev.prestarecondominios.com.br,5023,0#')).toMatchObject({ ok: true, keyword: 'SERVER', risk: 'connection' });
  });
  it('RESET# é conexão', () => {
    expect(classifyConsoleText('RESET#')).toMatchObject({ ok: true, keyword: 'RESET', risk: 'connection' });
  });
  it('TIMER,30,3600# é change', () => {
    expect(classifyConsoleText('TIMER,30,3600#')).toMatchObject({ ok: true, keyword: 'TIMER', risk: 'change' });
  });
  it('só faz trim do texto', () => {
    expect(classifyConsoleText('  STATUS#  ')).toMatchObject({ ok: true, text: 'STATUS#' });
  });
  it.each(['PARAM#', 'WHERE#', 'VERSION#', 'GPRSSET#', 'APN#', 'SERVER#', 'TIMER#', 'where#'])('%s é leitura', (t) => {
    expect(classifyConsoleText(t)).toMatchObject({ ok: true, risk: 'read' });
  });
  it.each(['GMT,W,3,0#', 'FACTORY#', 'PWD,123#', 'format#', 'PASSWORD,1#', 'GPRSON,0#', 'STATUS,1#', 'WHERE,1#', 'RESET,1#', 'SOS,A,123#', 'FOO#'])(
    'allowlist: recusa %s com o motivo genérico',
    (t) => {
      expect(classifyConsoleText(t)).toEqual({ ok: false, reason: 'Comando não permitido pelo console.' });
    },
  );
  it.each(['RELAY,1#', 'relay,1#', 'Relay,0#', 'dyd#', 'DYD,000000#', 'HFYD#', 'hfyd,000000#', 'STOP#', 'RESUME#', 'resume#'])(
    'relé/motor (%s) nunca pelo console: aponta para Bloquear/Desbloquear',
    (t) => {
      expect(classifyConsoleText(t)).toEqual({ ok: false, reason: 'Use Bloquear/Desbloquear da ficha da moto.' });
    },
  );
  it.each(['STATUS', 'STA TUS#', '', '<script>#', `${'A'.repeat(100)}#`, '#'])('recusa formato inválido %j', (t) => {
    expect(classifyConsoleText(t).ok).toBe(false);
  });
});
