import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { BpmnXmlValidator } from '../bpmn/bpmn-xml.validator';
import { BpmnModelVersion } from './entities/bpmn-model-version.entity';
import {
  MODEL_ID,
  aModel,
  aValidation,
  aVersion,
  fakeDataSource,
  fakeManager,
} from './models.fixtures';
import { VersionsService } from './versions.service';

function setup(options: { lockedModel?: ReturnType<typeof aModel> | null } = {}) {
  const manager = fakeManager(options.lockedModel === undefined ? aModel() : options.lockedModel);
  const dataSource = fakeDataSource(manager);
  const models = { exists: jest.fn().mockResolvedValue(true) };
  const versions = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
  const validator = { validate: jest.fn().mockResolvedValue(aValidation()) };
  const service = new VersionsService(
    dataSource as never,
    models as never,
    versions as never,
    validator as unknown as BpmnXmlValidator,
  );
  return { service, manager, dataSource, models, versions, validator };
}

describe('VersionsService', () => {
  describe('create', () => {
    it('validates, locks the model and appends version current + 1', async () => {
      const { service, manager, validator } = setup();
      validator.validate.mockResolvedValue(
        aValidation({ processId: 'Process_new', warnings: ['unknown attribute <foo>'] }),
      );

      const dto = await service.create(MODEL_ID, { xml: '<xml v3 />', comment: '  fix gateway ' });

      expect(manager.findOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(dto).toMatchObject({
        modelId: MODEL_ID,
        versionNumber: 3,
        xml: '<xml v3 />',
        comment: 'fix gateway',
        warnings: ['unknown attribute <foo>'],
      });
      const model = manager.saved.find((e) => !(e instanceof BpmnModelVersion));
      expect(model).toMatchObject({ currentVersionNumber: 3, processId: 'Process_new' });
    });

    it('stores an empty comment as null', async () => {
      const { service } = setup();
      expect((await service.create(MODEL_ID, { xml: 'x', comment: '  ' })).comment).toBeNull();
    });

    it('does not touch the database when the XML is invalid', async () => {
      const { service, validator, dataSource } = setup();
      validator.validate.mockRejectedValue(new Error('invalid'));
      await expect(service.create(MODEL_ID, { xml: 'nope' })).rejects.toThrow('invalid');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('returns 404 when the model does not exist', async () => {
      const { service } = setup({ lockedModel: null });
      await expect(service.create(MODEL_ID, { xml: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('maps a unique violation to 409', async () => {
      const { service, dataSource } = setup();
      dataSource.transaction.mockRejectedValue(
        new QueryFailedError('INSERT', [], Object.assign(new Error('dup'), { code: '23505' })),
      );
      await expect(service.create(MODEL_ID, { xml: 'x' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('restore', () => {
    it('copies an old version into a new one', async () => {
      const { service, versions } = setup();
      versions.findOne.mockResolvedValue(aVersion({ versionNumber: 1, xml: '<xml v1 />' }));

      const dto = await service.restore(MODEL_ID, 1);

      expect(dto).toMatchObject({
        versionNumber: 3,
        xml: '<xml v1 />',
        comment: 'Restored from v1',
      });
    });

    it('returns 404 for an unknown version', async () => {
      const { service, versions } = setup();
      versions.findOne.mockResolvedValue(null);
      await expect(service.restore(MODEL_ID, 9)).rejects.toThrow(`Version 9 of model ${MODEL_ID}`);
    });
  });

  describe('findVersion', () => {
    it('reports a missing model rather than a missing version', async () => {
      const { service, versions, models } = setup();
      versions.findOne.mockResolvedValue(null);
      models.exists.mockResolvedValue(false);
      await expect(service.findVersion(MODEL_ID, 1)).rejects.toThrow(`Model ${MODEL_ID} not found`);
    });
  });

  describe('list', () => {
    it('lists newest first without XML', async () => {
      const { service, versions } = setup();
      versions.find.mockResolvedValue([aVersion({ versionNumber: 2 }), aVersion()]);

      const list = await service.list(MODEL_ID);

      expect(versions.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { versionNumber: 'DESC' },
          select: expect.not.objectContaining({ xml: true }),
        }),
      );
      expect(list.map((v) => v.versionNumber)).toEqual([2, 1]);
      expect(list[0]).not.toHaveProperty('xml');
    });

    it('returns 404 for an unknown model', async () => {
      const { service, models } = setup();
      models.exists.mockResolvedValue(false);
      await expect(service.list(MODEL_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
