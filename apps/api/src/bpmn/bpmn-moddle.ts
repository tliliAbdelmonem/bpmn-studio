/*
 * bpmn-moddle is ESM-only. The API is CommonJS, so it is loaded with require():
 * Node >= 22.12 supports require() of ES modules, and Jest transforms it (see jest.config.cts).
 */

export interface ModdleElement {
  $type: string;
  id?: string;
  name?: string;
  isExecutable?: boolean;
  rootElements?: ModdleElement[];
  [key: string]: unknown;
}

export interface ModdleWarning {
  message: string;
}

export interface FromXmlResult {
  rootElement: ModdleElement;
  warnings: ModdleWarning[];
}

export interface BpmnModdleInstance {
  fromXML(xml: string, typeName?: string): Promise<FromXmlResult>;
}

type BpmnModdleConstructor = new (packages?: Record<string, unknown>) => BpmnModdleInstance;

const { BpmnModdle } = require('bpmn-moddle') as { BpmnModdle: BpmnModdleConstructor };
const zeebeSchema = require('zeebe-bpmn-moddle/resources/zeebe.json') as Record<string, unknown>;

/** A moddle instance that knows the BPMN 2.0 and Camunda 8 `zeebe:` extension schemas. */
export function createZeebeModdle(): BpmnModdleInstance {
  return new BpmnModdle({ zeebe: zeebeSchema });
}
