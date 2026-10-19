export interface BpmnModelDto {
  id: string;
  name: string;
  description: string | null;
  processId: string | null;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModelRequest {
  name: string;
  description?: string;
  /** Initial BPMN XML; a minimal Zeebe-ready diagram is used when omitted. */
  xml?: string;
}

export interface UpdateModelRequest {
  name?: string;
  description?: string | null;
}
