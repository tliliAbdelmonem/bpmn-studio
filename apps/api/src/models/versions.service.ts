import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  BpmnModelVersionDto,
  BpmnModelVersionSummaryDto,
  CreateVersionRequest,
} from '@bpmn-studio/shared';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BpmnValidationResult, BpmnXmlValidator } from '../bpmn/bpmn-xml.validator';
import { isUniqueViolation } from '../common/postgres-errors';
import { BpmnModelVersion } from './entities/bpmn-model-version.entity';
import { BpmnModel } from './entities/bpmn-model.entity';
import { toVersionDto, toVersionSummaryDto } from './models.mapper';

export interface NewVersion {
  xml: string;
  comment?: string | null;
  validation: BpmnValidationResult;
}

@Injectable()
export class VersionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(BpmnModel) private readonly models: Repository<BpmnModel>,
    @InjectRepository(BpmnModelVersion) private readonly versions: Repository<BpmnModelVersion>,
    private readonly validator: BpmnXmlValidator,
  ) {}

  /** Newest first, without XML. */
  async list(modelId: string): Promise<BpmnModelVersionSummaryDto[]> {
    await this.ensureModelExists(modelId);
    const rows = await this.versions.find({
      where: { modelId },
      order: { versionNumber: 'DESC' },
      select: { id: true, modelId: true, versionNumber: true, comment: true, createdAt: true },
    });
    return rows.map(toVersionSummaryDto);
  }

  async get(modelId: string, versionNumber: number): Promise<BpmnModelVersionDto> {
    return toVersionDto(await this.findVersion(modelId, versionNumber));
  }

  async create(modelId: string, body: CreateVersionRequest): Promise<BpmnModelVersionDto> {
    const validation = await this.validator.validate(body.xml);
    const version = await this.appendInTransaction(modelId, {
      xml: body.xml,
      comment: body.comment,
      validation,
    });
    return toVersionDto(version, validation.warnings);
  }

  /** Versions are immutable: restoring copies an old version into a new one. */
  async restore(modelId: string, versionNumber: number): Promise<BpmnModelVersionDto> {
    const source = await this.findVersion(modelId, versionNumber);
    const validation = await this.validator.validate(source.xml);
    const version = await this.appendInTransaction(modelId, {
      xml: source.xml,
      comment: `Restored from v${versionNumber}`,
      validation,
    });
    return toVersionDto(version);
  }

  async findVersion(modelId: string, versionNumber: number): Promise<BpmnModelVersion> {
    const version = await this.versions.findOne({ where: { modelId, versionNumber } });
    if (!version) {
      await this.ensureModelExists(modelId);
      throw new NotFoundException(`Version ${versionNumber} of model ${modelId} not found.`);
    }
    return version;
  }

  /**
   * Adds the next version to a model inside an existing transaction. The caller must hold
   * a write lock on the model row (or have just inserted it).
   */
  async append(
    manager: EntityManager,
    model: BpmnModel,
    input: NewVersion,
  ): Promise<BpmnModelVersion> {
    const versionNumber = model.currentVersionNumber + 1;
    const version = await manager.save(
      manager.create(BpmnModelVersion, {
        modelId: model.id,
        versionNumber,
        xml: input.xml,
        comment: input.comment?.trim() || null,
      }),
    );
    model.currentVersionNumber = versionNumber;
    model.processId = input.validation.processId;
    await manager.save(model);
    return version;
  }

  private async appendInTransaction(modelId: string, input: NewVersion): Promise<BpmnModelVersion> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const model = await manager.findOne(BpmnModel, {
          where: { id: modelId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!model) {
          throw new NotFoundException(`Model ${modelId} not found.`);
        }
        return this.append(manager, model, input);
      });
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException('Another version was saved at the same time. Please retry.');
      }
      throw e;
    }
  }

  private async ensureModelExists(modelId: string): Promise<void> {
    if (!(await this.models.exists({ where: { id: modelId } }))) {
      throw new NotFoundException(`Model ${modelId} not found.`);
    }
  }
}
