import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MODEL_NAME_MAX_LENGTH } from '@bpmn-studio/shared';
import { BpmnModelVersion } from './bpmn-model-version.entity';

@Entity('bpmn_model')
export class BpmnModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: MODEL_NAME_MAX_LENGTH })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** Process id of the current version's executable process. */
  @Column({ name: 'process_id', type: 'varchar', length: 255, nullable: true })
  processId!: string | null;

  @Column({ name: 'current_version_number', type: 'int', default: 0 })
  currentVersionNumber!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => BpmnModelVersion, (version) => version.model)
  versions?: BpmnModelVersion[];
}
