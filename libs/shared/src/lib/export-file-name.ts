/** `<model-name>-v<n>.bpmn`, with an ASCII fallback for the Content-Disposition header. */
export function exportFileName(
  modelName: string,
  versionNumber: number,
): { ascii: string; utf8: string } {
  const suffix = `-v${versionNumber}.bpmn`;
  // eslint-disable-next-line no-control-regex
  const utf8 = modelName.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').trim() || 'model';
  const ascii =
    utf8
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'model';
  return { ascii: ascii + suffix, utf8: utf8 + suffix };
}
