export interface BpmnModelVersionSummaryDto {
  id: string;
  modelId: string;
  versionNumber: number;
  comment: string | null;
  createdAt: string;
}

export interface BpmnModelVersionDto extends BpmnModelVersionSummaryDto {
  xml: string;
  /** Non-blocking BPMN parser warnings, only present on the response that created the version. */
  warnings?: string[];
}

export interface CreateVersionRequest {
  xml: string;
  comment?: string;
}
