import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  BpmnModelVersionDto,
  BpmnModelVersionSummaryDto,
  CreateVersionRequest,
  VERSION_COMMENT_MAX_LENGTH,
} from '@bpmn-studio/shared';

export class CreateVersionBody implements CreateVersionRequest {
  @ApiProperty({ description: 'BPMN 2.0 XML' })
  @IsString()
  @IsNotEmpty()
  xml!: string;

  @ApiPropertyOptional({ maxLength: VERSION_COMMENT_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(VERSION_COMMENT_MAX_LENGTH)
  comment?: string;
}

export class VersionSummaryResponse implements BpmnModelVersionSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) modelId!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ type: String, nullable: true }) comment!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class VersionResponse extends VersionSummaryResponse implements BpmnModelVersionDto {
  @ApiProperty() xml!: string;
  @ApiPropertyOptional({ type: [String] }) warnings?: string[];
}
