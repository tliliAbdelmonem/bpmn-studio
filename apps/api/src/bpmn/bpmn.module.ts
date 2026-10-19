import { Module } from '@nestjs/common';
import { BpmnXmlValidator } from './bpmn-xml.validator';

@Module({
  providers: [BpmnXmlValidator],
  exports: [BpmnXmlValidator],
})
export class BpmnModule {}
