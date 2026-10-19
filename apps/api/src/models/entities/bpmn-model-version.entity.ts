import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BpmnModel } from './bpmn-model.entity';

/** Immutable: rows are only ever inserted (restore creates a new version). */
@Entity('bpmn_model_version')
@Unique('uq_bpmn_model_version_model_number', ['modelId', 'versionNumber'])
export class BpmnModelVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'model_id', type: 'uuid' })
  modelId!: string;

  @ManyToOne(() => BpmnModel, (model) => model.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id', foreignKeyConstraintName: 'fk_bpmn_model_version_model' })
  model?: BpmnModel;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber!: number;

  @Column({ type: 'text' })
  xml!: string;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
