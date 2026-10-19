import { BpmnModelDto, BpmnModelVersionDto, BpmnModelVersionSummaryDto } from '@bpmn-studio/shared';
import { BpmnModelVersion } from './entities/bpmn-model-version.entity';
import { BpmnModel } from './entities/bpmn-model.entity';

export function toModelDto(model: BpmnModel): BpmnModelDto {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    processId: model.processId,
    currentVersionNumber: model.currentVersionNumber,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

export function toVersionSummaryDto(version: BpmnModelVersion): BpmnModelVersionSummaryDto {
  return {
    id: version.id,
    modelId: version.modelId,
    versionNumber: version.versionNumber,
    comment: version.comment,
    createdAt: version.createdAt.toISOString(),
  };
}

export function toVersionDto(version: BpmnModelVersion, warnings?: string[]): BpmnModelVersionDto {
  return {
    ...toVersionSummaryDto(version),
    xml: version.xml,
    ...(warnings?.length ? { warnings } : {}),
  };
}
