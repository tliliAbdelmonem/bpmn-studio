import { BpmnValidationResult } from '../bpmn/bpmn-xml.validator';
import { BpmnModelVersion } from './entities/bpmn-model-version.entity';
import { BpmnModel } from './entities/bpmn-model.entity';

export const MODEL_ID = '2b0c5a8e-8a43-4d5e-9a62-3f0f6c3a1b11';

export function aModel(overrides: Partial<BpmnModel> = {}): BpmnModel {
  return Object.assign(new BpmnModel(), {
    id: MODEL_ID,
    name: 'Order',
    description: null,
    processId: 'Process_order',
    currentVersionNumber: 2,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  });
}

export function aVersion(overrides: Partial<BpmnModelVersion> = {}): BpmnModelVersion {
  return Object.assign(new BpmnModelVersion(), {
    id: 'v-id',
    modelId: MODEL_ID,
    versionNumber: 1,
    xml: '<xml v1 />',
    comment: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });
}

export function aValidation(overrides: Partial<BpmnValidationResult> = {}): BpmnValidationResult {
  return { processId: 'Process_order', processName: 'Order', warnings: [], ...overrides };
}

/** An EntityManager stand-in that stores what is saved and assigns ids/timestamps. */
export function fakeManager(findOneResult: BpmnModel | null = null) {
  const saved: object[] = [];
  const manager = {
    saved,
    findOne: jest.fn().mockResolvedValue(findOneResult),
    create: jest.fn((entity: new () => object, values: object) =>
      Object.assign(new entity(), values),
    ),
    save: jest.fn(async (entity: { id?: string; createdAt?: Date; updatedAt?: Date }) => {
      entity.id ??= entity instanceof BpmnModel ? 'new-model-id' : 'new-version-id';
      entity.createdAt ??= new Date('2026-02-01T00:00:00Z');
      if (entity instanceof BpmnModel) entity.updatedAt = new Date('2026-02-01T00:00:00Z');
      saved.push(entity);
      return entity;
    }),
  };
  return manager;
}

export function fakeDataSource(manager: ReturnType<typeof fakeManager>) {
  return { transaction: jest.fn((work: (m: unknown) => unknown) => work(manager)) };
}
