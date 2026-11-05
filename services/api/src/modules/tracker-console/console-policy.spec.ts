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
  it.each(['GMT,W,3,0#', 'FACTORY#', 'PWD,123#', 'format#', 'PASSWORD,1#'])('recusa %s', (t) => {
    const r = classifyConsoleText(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/\S/);
  });
  it.each(['STATUS', 'STA TUS#', '', '<script>#', `${'A'.repeat(100)}#`, '#'])('recusa formato inválido %j', (t) => {
    expect(classifyConsoleText(t).ok).toBe(false);
  });
});
