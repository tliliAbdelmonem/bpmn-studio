import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BpmnModelDto } from '@bpmn-studio/shared';
import { ApiProblems } from '../common/api-problems.decorator';
import { CreateModelBody, ImportModelBody, ModelResponse, UpdateModelBody } from './dto/model.dto';
import { ModelsService, UploadedBpmnFile } from './models.service';

@ApiTags('models')
@Controller('models')
export class ModelsController {
  constructor(private readonly models: ModelsService) {}

  @Get()
  @ApiOkResponse({ type: [ModelResponse] })
  list(): Promise<BpmnModelDto[]> {
    return this.models.list();
  }

  @Post()
  @ApiCreatedResponse({ type: ModelResponse, description: 'Model created with version 1' })
  @ApiProblems(HttpStatus.BAD_REQUEST, HttpStatus.UNPROCESSABLE_ENTITY)
  create(@Body() body: CreateModelBody): Promise<BpmnModelDto> {
    return this.models.create(body);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ImportModelBody })
  @ApiCreatedResponse({ type: ModelResponse, description: 'Model created with version 1' })
  @ApiProblems(
    HttpStatus.BAD_REQUEST,
    HttpStatus.PAYLOAD_TOO_LARGE,
    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    HttpStatus.UNPROCESSABLE_ENTITY,
  )
  import(
    @UploadedFile() file: UploadedBpmnFile | undefined,
    @Body() body: ImportModelBody,
  ): Promise<BpmnModelDto> {
    return this.models.import(file, body.name);
  }

  @Get(':id')
  @ApiOkResponse({ type: ModelResponse })
  @ApiProblems(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  get(@Param('id', ParseUUIDPipe) id: string): Promise<BpmnModelDto> {
    return this.models.get(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ModelResponse })
  @ApiProblems(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateModelBody,
  ): Promise<BpmnModelDto> {
    return this.models.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Model, versions and deployment log deleted' })
  @ApiProblems(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.models.remove(id);
  }

  @Post(':id/duplicate')
  @ApiCreatedResponse({ type: ModelResponse, description: 'Copy of the current version as v1' })
  @ApiProblems(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  duplicate(@Param('id', ParseUUIDPipe) id: string): Promise<BpmnModelDto> {
    return this.models.duplicate(id);
  }
}
