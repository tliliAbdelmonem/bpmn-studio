import { exportFileName } from './export-file-name';

describe('exportFileName', () => {
  it('keeps simple names', () => {
    expect(exportFileName('Order', 3)).toEqual({ ascii: 'Order-v3.bpmn', utf8: 'Order-v3.bpmn' });
  });

  it('removes path and header-breaking characters', () => {
    expect(exportFileName('a/b "c"', 1)).toEqual({
      ascii: 'a-b-c-v1.bpmn',
      utf8: 'a-b -c--v1.bpmn',
    });
  });

  it('gives an ASCII fallback for accented names', () => {
    expect(exportFileName('Équipe café', 2).ascii).toBe('Equipe-cafe-v2.bpmn');
  });
});
