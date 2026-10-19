import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProblemFieldError } from '@bpmn-studio/shared';
import { EnvironmentVariables } from '../config/env.validation';
import { createZeebeModdle, ModdleElement } from './bpmn-moddle';

export interface BpmnValidationResult {
  /** Id of the first executable process (or the first process if none is executable). */
  processId: string;
  processName: string | null;
  /** Non-blocking parser warnings, e.g. unknown attributes. */
  warnings: string[];
}

export const INVALID_BPMN_TITLE = 'Invalid BPMN';

/** Checks that XML is well-formed BPMN 2.0 (with Camunda 8 extensions) before it is stored. */
@Injectable()
export class BpmnXmlValidator {
  private readonly maxBytes: number;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.maxBytes = config.get('MAX_BPMN_SIZE_BYTES', { infer: true });
  }

  async validate(xml: string): Promise<BpmnValidationResult> {
    if (!xml || !xml.trim()) {
      throw invalid('The BPMN XML is empty.');
    }
    if (Buffer.byteLength(xml, 'utf8') > this.maxBytes) {
      throw invalid(`The BPMN XML is larger than ${this.maxBytes} bytes.`);
    }
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
      throw invalid('DOCTYPE and ENTITY declarations are not allowed.');
    }

    let rootElement: ModdleElement;
    let warnings: string[];
    try {
      const result = await createZeebeModdle().fromXML(xml);
      rootElement = result.rootElement;
      warnings = result.warnings.map((w) => firstLine(w.message));
    } catch (e) {
      throw invalid('The file is not well-formed BPMN 2.0 XML.', [
        { message: firstLine(e instanceof Error ? e.message : String(e)) },
      ]);
    }

    if (rootElement?.$type !== 'bpmn:Definitions') {
      throw invalid('The root element must be <bpmn:definitions>.');
    }

    const processes = (rootElement.rootElements ?? []).filter((e) => e.$type === 'bpmn:Process');
    const process = processes.find((p) => p.isExecutable) ?? processes[0];
    if (!process?.id) {
      throw invalid('The diagram must contain at least one <bpmn:process>.');
    }

    return { processId: process.id, processName: process.name ?? null, warnings };
  }
}

function invalid(detail: string, errors?: ProblemFieldError[]): UnprocessableEntityException {
  return new UnprocessableEntityException({ title: INVALID_BPMN_TITLE, detail, errors });
}

function firstLine(message: string): string {
  return message.split('\n')[0].trim();
}
