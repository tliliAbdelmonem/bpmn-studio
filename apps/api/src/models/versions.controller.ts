import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiParam, ApiProduces, ApiTags } from '@nestjs/swagger';
import {
  BpmnModelVersionDto,
  BpmnModelVersionSummaryDto,
  exportFileName,
} from '@bpmn-studio/shared';
import type { Response } from 'express';
import { ApiProblems } from '../common/api-problems.decorator';
import { CreateVersionBody, VersionResponse, VersionSummaryResponse } from './dto/version.dto';
import { ModelsService } from './models.service';
import { VersionsService } from './versions.service';

@ApiTags('versions')
@ApiParam({ name: 'id', format: 'uuid', description: 'Model id' })
@Controller('models/:id/versions')
export class VersionsController {
  constructor(
    private readonly versions: VersionsService,
    private readonly models: ModelsService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [VersionSummaryResponse], description: 'Newest first, without XML' })
  @ApiProblems(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  list(@Param('id', ParseUUIDPipe) id: string): Promise<BpmnModelVersionSummaryDto[]> {
    return this.versions.list(id);
  }

  @Post()
  @ApiCreatedResponse({ type: VersionResponse, description: 'New version (current + 1)' })
  @ApiProblems(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
    HttpStatus.PAYLOAD_TOO_LARGE,
    HttpStatus.UNPROCESSABLE_ENTITY,
  )
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateVersionBody,
  ): Promise<BpmnModelVersionDto> {
    return this.versions.create(id, body);
  }

  @Get(':n')
  @ApiOkResponse({ type: VersionResponse })
  @ApiProblems(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('n', ParseIntPipe) n: number,
  ): Promise<BpmnModelVersionDto> {
    return this.versions.get(id, n);
  }

  @Post(':n/restore')
  @ApiCreatedResponse({
    type: VersionResponse,
    description: 'New version with the XML of version n',
  })
  @ApiProblems(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('n', ParseIntPipe) n: number,
  ): Promise<BpmnModelVersionDto> {
    return this.versions.restore(id, n);
  }

  @Get(':n/export')
  @ApiProduces('application/xml')
  @ApiOkResponse({ schema: { type: 'string' }, description: 'The .bpmn file as an attachment' })
  @ApiProblems(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async export(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('n', ParseIntPipe) n: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const [model, version] = await Promise.all([
      this.models.get(id),
      this.versions.findVersion(id, n),
    ]);
    const fileName = exportFileName(model.name, version.versionNumber);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName.ascii}"; filename*=UTF-8''${encodeURIComponent(fileName.utf8)}`,
    );
    return version.xml;
  }
}
