import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Patient } from '../../patient/entity/patient';
import { EToothCondition } from '../enum/enum';

@Entity('tooth_records')
@Unique(['patient_id', 'tooth_number'])
export class ToothRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patient_id: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id', referencedColumnName: 'id' })
  patient: Patient;

  @Column({ type: 'smallint' })
  tooth_number: number;

  @Column({ type: 'enum', enum: EToothCondition })
  condition: EToothCondition;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
