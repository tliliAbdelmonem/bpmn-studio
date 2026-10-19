/**
 * Typings for bpmn-io packages that ship without them. bpmn-js and diagram-js have their own.
 * Keep these minimal: only what the app imports.
 */

declare module 'bpmn-js-properties-panel' {
  type DiagramModule = Record<string, unknown>;
  export const BpmnPropertiesPanelModule: DiagramModule;
  export const BpmnPropertiesProviderModule: DiagramModule;
  export const ZeebePropertiesProviderModule: DiagramModule;
}

declare module 'camunda-bpmn-js-behaviors/lib/camunda-cloud' {
  const ZeebeBehaviorsModule: Record<string, unknown>;
  export default ZeebeBehaviorsModule;
}
