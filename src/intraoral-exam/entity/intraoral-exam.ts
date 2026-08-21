import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from '../../patient/entity/patient';
import {
  EPeriodontalScreening,
  EOcclusion,
  EAppliance,
  ETmd,
  EXrayType,
} from '../enum/enum';

@Entity('intraoral_exams')
export class IntraoralExam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patient_id: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'exam_date', type: 'date' })
  exam_date: string;

  @Column({ type: 'simple-array', nullable: true })
  periodontal: EPeriodontalScreening[] | null;

  @Column({ type: 'simple-array', nullable: true })
  occlusion: EOcclusion[] | null;

  @Column({ type: 'simple-array', nullable: true })
  appliances: EAppliance[] | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  appliances_other: string | null;

  @Column({ type: 'simple-array', nullable: true })
  tmd: ETmd[] | null;

  @Column({ type: 'simple-array', nullable: true })
  xray_taken: EXrayType[] | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  xray_periapical_teeth: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  xray_others: string | null;

  @Column({ type: 'jsonb', nullable: true })
  tooth_records: Array<{
    tooth_number: number;
    condition: string;
    remarks?: string;
  }> | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
