import {
  BadRequestException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { BpmnXmlValidator } from '../bpmn/bpmn-xml.validator';
import { BpmnModel } from './entities/bpmn-model.entity';
import { ModelsService } from './models.service';
import {
  MODEL_ID,
  aModel,
  aValidation,
  aVersion,
  fakeDataSource,
  fakeManager,
} from './models.fixtures';
import { VersionsService } from './versions.service';

function setup() {
  const manager = fakeManager();
  const dataSource = fakeDataSource(manager);
  const models = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(aModel()),
    save: jest.fn(async (m: BpmnModel) => m),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const versions = {
    append: jest.fn(
      async (_m: unknown, model: BpmnModel, input: { validation: { processId: string } }) => {
        model.currentVersionNumber += 1;
        model.processId = input.validation.processId;
        return aVersion();
      },
    ),
    findVersion: jest.fn().mockResolvedValue(aVersion({ versionNumber: 2, xml: '<xml v2 />' })),
  };
  const validator = { validate: jest.fn().mockResolvedValue(aValidation()) };
  const service = new ModelsService(
    dataSource as never,
    models as never,
    versions as unknown as VersionsService,
    validator as unknown as BpmnXmlValidator,
  );
  return { service, manager, dataSource, models, versions, validator };
}

const file = (originalname: string, content: string) => ({
  originalname,
  buffer: Buffer.from(content, 'utf8'),
});

describe('ModelsService', () => {
  describe('create', () => {
    it('starts from the Zeebe template named after the model', async () => {
      const { service, validator, versions } = setup();

      const dto = await service.create({ name: 'Order & pay' });

      const xml: string = validator.validate.mock.calls[0][0];
      expect(xml).toMatch(
        /<bpmn:process id="Process_[0-9a-f]{8}" name="Order &amp; pay" isExecutable="true">/,
      );
      expect(xml).toContain('xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"');
      expect(versions.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(BpmnModel),
        expect.objectContaining({ xml, comment: null }),
      );
      expect(dto).toMatchObject({
        name: 'Order & pay',
        currentVersionNumber: 1,
        processId: 'Process_order',
      });
    });

    it('uses the provided XML', async () => {
      const { service, validator } = setup();
      await service.create({ name: 'A', xml: '<custom />' });
      expect(validator.validate).toHaveBeenCalledWith('<custom />');
    });

    it('creates nothing when the XML is invalid', async () => {
      const { service, validator, dataSource } = setup();
      validator.validate.mockRejectedValue(new Error('invalid'));
      await expect(service.create({ name: 'A', xml: 'x' })).rejects.toThrow('invalid');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('only changes the given fields', async () => {
      const { service } = setup();
      const dto = await service.update(MODEL_ID, { description: 'new' });
      expect(dto).toMatchObject({ name: 'Order', description: 'new' });
    });

    it('can clear the description', async () => {
      const { service, models } = setup();
      models.findOne.mockResolvedValue(aModel({ description: 'old' }));
      expect((await service.update(MODEL_ID, { description: null })).description).toBeNull();
    });

    it('returns 404 for an unknown model', async () => {
      const { service, models } = setup();
      models.findOne.mockResolvedValue(null);
      await expect(service.update(MODEL_ID, { name: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('returns 404 when nothing was deleted', async () => {
      const { service, models } = setup();
      models.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove(MODEL_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('duplicate', () => {
    it('copies the current version into a new model', async () => {
      const { service, versions } = setup();

      const dto = await service.duplicate(MODEL_ID);

      expect(versions.findVersion).toHaveBeenCalledWith(MODEL_ID, 2);
      expect(versions.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: 'Order (copy)' }),
        expect.objectContaining({ xml: '<xml v2 />', comment: 'Duplicated from "Order" v2' }),
      );
      expect(dto).toMatchObject({ name: 'Order (copy)', currentVersionNumber: 1 });
    });

    it('keeps the copy name within the length limit', async () => {
      const { service, models } = setup();
      models.findOne.mockResolvedValue(aModel({ name: 'x'.repeat(200) }));
      expect((await service.duplicate(MODEL_ID)).name).toHaveLength(200);
    });
  });

  describe('import', () => {
    it('rejects a missing file', async () => {
      const { service } = setup();
      await expect(service.import(undefined)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects other file types with 415', async () => {
      const { service } = setup();
      await expect(service.import(file('diagram.png', 'x'))).rejects.toBeInstanceOf(
        UnsupportedMediaTypeException,
      );
    });

    it('rejects an empty file', async () => {
      const { service } = setup();
      await expect(service.import(file('a.bpmn', ''))).rejects.toBeInstanceOf(BadRequestException);
    });

    it('strips a UTF-8 BOM and names the model after the process', async () => {
      const { service, validator, versions } = setup();

      const dto = await service.import(file('order.BPMN', '﻿<xml />'));

      expect(validator.validate).toHaveBeenCalledWith('<xml />');
      expect(dto.name).toBe('Order');
      expect(versions.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ comment: 'Imported from order.BPMN' }),
      );
    });

    it('falls back to the file name, and prefers an explicit name', async () => {
      const { service, validator } = setup();
      validator.validate.mockResolvedValue(aValidation({ processName: null }));
      expect((await service.import(file('invoice.bpmn', '<xml />'))).name).toBe('invoice');
      expect((await service.import(file('invoice.bpmn', '<xml />'), 'Billing')).name).toBe(
        'Billing',
      );
    });
  });
});
