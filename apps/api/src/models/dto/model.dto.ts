import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import {
  BpmnModelDto,
  CreateModelRequest,
  MODEL_DESCRIPTION_MAX_LENGTH,
  MODEL_NAME_MAX_LENGTH,
  UpdateModelRequest,
} from '@bpmn-studio/shared';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateModelBody implements CreateModelRequest {
  @ApiProperty({ maxLength: MODEL_NAME_MAX_LENGTH, example: 'Order fulfillment' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MODEL_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({ maxLength: MODEL_DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MODEL_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({ description: 'Initial BPMN XML. Defaults to a minimal Zeebe diagram.' })
  @IsOptional()
  @IsString()
  xml?: string;
}

export class UpdateModelBody implements UpdateModelRequest {
  @ApiPropertyOptional({ maxLength: MODEL_NAME_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MODEL_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ maxLength: MODEL_DESCRIPTION_MAX_LENGTH, nullable: true, type: String })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(MODEL_DESCRIPTION_MAX_LENGTH)
  description?: string | null;
}

export class ImportModelBody {
  @ApiProperty({ type: 'string', format: 'binary', description: '.bpmn or .xml file' })
  file!: unknown;

  @ApiPropertyOptional({
    maxLength: MODEL_NAME_MAX_LENGTH,
    description: 'Defaults to the process name, then the file name.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MODEL_NAME_MAX_LENGTH)
  name?: string;
}

export class ModelResponse implements BpmnModelDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: String, nullable: true }) processId!: string | null;
  @ApiProperty() currentVersionNumber!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
