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
  EToothArea,
  EToothCondition,
  EOcclusion,
  EAppliance,
  ETmd,
  EXrayType,
} from '../enum/enum';
import { Appointment } from 'src/appointment/entity/appointment';
import { EDentalService } from '../../appointment/enum/appointment';

@Entity('intraoral_exams')
export class IntraoralExam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid', nullable: true })
  patient_id: string | null;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient | null;

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
    condition?: EToothCondition;
    areas?: Array<{
      area: EToothArea;
      condition: EToothCondition;
    }>;
    remarks?: string;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  services: Array<{
    service?: EDentalService | string | null;
    service_type?: string;
    service_other?: string | null;
    amount_charge?: number;
  }> | null;

  @Column({ name: 'appointment_id', type: 'uuid', nullable: true })
  appointment_id: string | null;

  @Column({
    name: 'additional_service',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  additional_service: string | null;

  @Column({
    name: 'additional_charge',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  additional_charge: number | null;

  @ManyToOne(() => Appointment, (appointment) => appointment.intraoral_exams, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
