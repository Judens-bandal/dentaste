// appointments/appointment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Patient } from '../../patient/entity/patient';

import { Payment } from '../../payment/entity/payment';
import { EBranch } from '../enum/appointment';
import { Transform } from 'class-transformer';
import { transformDateToISOString } from '../../../utils/common.helper';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, (patient) => patient.appointments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  // Renamed from branch_id — it's a fixed enum value, not a foreign key.
  @Column({ type: 'varchar', length: 20 })
  branch: EBranch;

  // Renamed from date (DATE) — now stores exact date AND time.
  @Column({ name: 'scheduled_at' })
  scheduledAt: string;

  @Column({ name: 'treatment_done', type: 'text' })
  treatmentDone: string;

  @Column({
    name: 'debit_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  debitAmount: number;

  // Read-only from the app side — maintained by DB triggers.
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ name: 'no_show', type: 'smallint', default: 0 })
  noShow: number;

  @CreateDateColumn({ name: 'created_at' })
  @Transform(transformDateToISOString)
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @Transform(transformDateToISOString)
  updatedAt: Date;

  @OneToMany(() => Payment, (payment) => payment.appointment)
  payments: Payment[];
}
