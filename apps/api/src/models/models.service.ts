import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  BPMN_FILE_EXTENSIONS,
  BpmnModelDto,
  CreateModelRequest,
  MODEL_NAME_MAX_LENGTH,
  UpdateModelRequest,
  createNewDiagramXml,
} from '@bpmn-studio/shared';
import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import { DataSource, Repository } from 'typeorm';
import { BpmnValidationResult, BpmnXmlValidator } from '../bpmn/bpmn-xml.validator';
import { BpmnModel } from './entities/bpmn-model.entity';
import { toModelDto } from './models.mapper';
import { VersionsService } from './versions.service';

export interface UploadedBpmnFile {
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class ModelsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(BpmnModel) private readonly models: Repository<BpmnModel>,
    private readonly versions: VersionsService,
    private readonly validator: BpmnXmlValidator,
  ) {}

  /** Most recently changed first. */
  async list(): Promise<BpmnModelDto[]> {
    const rows = await this.models.find({ order: { updatedAt: 'DESC' } });
    return rows.map(toModelDto);
  }

  async get(id: string): Promise<BpmnModelDto> {
    return toModelDto(await this.findModel(id));
  }

  async create(body: CreateModelRequest): Promise<BpmnModelDto> {
    const xml =
      body.xml ?? createNewDiagramXml({ processId: newProcessId(), processName: body.name });
    const validation = await this.validator.validate(xml);
    return this.createWithFirstVersion(body.name, body.description ?? null, xml, validation, null);
  }

  async update(id: string, body: UpdateModelRequest): Promise<BpmnModelDto> {
    const model = await this.findModel(id);
    if (body.name !== undefined) model.name = body.name;
    if (body.description !== undefined) model.description = body.description;
    return toModelDto(await this.models.save(model));
  }

  /** Deletes the model with its versions (and, from Phase 5, its deployment log). */
  async remove(id: string): Promise<void> {
    const result = await this.models.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Model ${id} not found.`);
    }
  }

  /** New model whose first version is a copy of the source's current version. */
  async duplicate(id: string): Promise<BpmnModelDto> {
    const source = await this.findModel(id);
    const current = await this.versions.findVersion(id, source.currentVersionNumber);
    const validation = await this.validator.validate(current.xml);
    return this.createWithFirstVersion(
      truncate(`${source.name} (copy)`, MODEL_NAME_MAX_LENGTH),
      source.description,
      current.xml,
      validation,
      `Duplicated from "${source.name}" v${current.versionNumber}`,
    );
  }

  async import(file: UploadedBpmnFile | undefined, name?: string): Promise<BpmnModelDto> {
    if (!file) {
      throw new BadRequestException('Attach a .bpmn file in the "file" field.');
    }
    const extension = extname(file.originalname).toLowerCase();
    if (!(BPMN_FILE_EXTENSIONS as readonly string[]).includes(extension)) {
      throw new UnsupportedMediaTypeException(
        `Only ${BPMN_FILE_EXTENSIONS.join(', ')} files can be imported.`,
      );
    }
    if (file.buffer.length === 0) {
      throw new BadRequestException('The uploaded file is empty.');
    }

    const xml = file.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const validation = await this.validator.validate(xml);
    const modelName = truncate(
      name ||
        validation.processName?.trim() ||
        file.originalname.slice(0, -extension.length) ||
        'Imported model',
      MODEL_NAME_MAX_LENGTH,
    );
    return this.createWithFirstVersion(
      modelName,
      null,
      xml,
      validation,
      `Imported from ${file.originalname}`,
    );
  }

  private async createWithFirstVersion(
    name: string,
    description: string | null,
    xml: string,
    validation: BpmnValidationResult,
    comment: string | null,
  ): Promise<BpmnModelDto> {
    const model = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        manager.create(BpmnModel, { name, description, currentVersionNumber: 0, processId: null }),
      );
      await this.versions.append(manager, created, { xml, comment, validation });
      return created;
    });
    return toModelDto(model);
  }

  private async findModel(id: string): Promise<BpmnModel> {
    const model = await this.models.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Model ${id} not found.`);
    }
    return model;
  }
}

function newProcessId(): string {
  return `Process_${randomBytes(4).toString('hex')}`;
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}
