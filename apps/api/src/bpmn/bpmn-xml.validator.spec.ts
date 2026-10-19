import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createNewDiagramXml } from '@bpmn-studio/shared';
import { BpmnXmlValidator } from './bpmn-xml.validator';

const BPMN_NS = 'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"';

function validator(maxBytes = 1024 * 1024): BpmnXmlValidator {
  return new BpmnXmlValidator({ get: () => maxBytes } as unknown as ConfigService<never, true>);
}

async function expectInvalid(xml: string, detail: RegExp, v = validator()): Promise<void> {
  const error = await v.validate(xml).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(UnprocessableEntityException);
  const body = (error as UnprocessableEntityException).getResponse() as { detail: string };
  expect(body.detail).toMatch(detail);
}

describe('BpmnXmlValidator', () => {
  it('accepts the new-diagram template and extracts the process', async () => {
    const result = await validator().validate(
      createNewDiagramXml({ processId: 'Process_abc', processName: 'Order & pay' }),
    );
    expect(result).toEqual({ processId: 'Process_abc', processName: 'Order & pay', warnings: [] });
  });

  it('accepts zeebe extension elements without warnings', async () => {
    const xml = `<bpmn:definitions ${BPMN_NS} xmlns:zeebe="http://camunda.org/schema/zeebe/1.0" id="d">
      <bpmn:process id="P" isExecutable="true">
        <bpmn:serviceTask id="t"><bpmn:extensionElements><zeebe:taskDefinition type="send-mail" /></bpmn:extensionElements></bpmn:serviceTask>
      </bpmn:process></bpmn:definitions>`;
    expect((await validator().validate(xml)).warnings).toEqual([]);
  });

  it('prefers the executable process', async () => {
    const xml = `<bpmn:definitions ${BPMN_NS} id="d">
      <bpmn:process id="A" isExecutable="false" /><bpmn:process id="B" isExecutable="true" />
    </bpmn:definitions>`;
    expect((await validator().validate(xml)).processId).toBe('B');
  });

  it('returns unknown content as warnings', async () => {
    const xml = `<bpmn:definitions ${BPMN_NS} id="d"><bpmn:process id="P" foo="x" /></bpmn:definitions>`;
    expect((await validator().validate(xml)).warnings).toEqual(['unknown attribute <foo>']);
  });

  it.each([
    ['empty', '   ', /empty/],
    ['not XML', 'hello world', /not well-formed/],
    ['truncated', `<bpmn:definitions ${BPMN_NS} id="d"><bpmn:process id="P">`, /not well-formed/],
    ['not BPMN', '<html><body /></html>', /not well-formed/],
    ['no process', `<bpmn:definitions ${BPMN_NS} id="d" />`, /at least one <bpmn:process>/],
    [
      'a DOCTYPE',
      `<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><bpmn:definitions ${BPMN_NS} />`,
      /DOCTYPE/,
    ],
  ])('rejects %s', async (_label, xml, detail) => {
    await expectInvalid(xml, detail);
  });

  it('rejects XML over the size limit', async () => {
    await expectInvalid(
      createNewDiagramXml({ processId: 'P' }),
      /larger than 100 bytes/,
      validator(100),
    );
  });
});
