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
import { EAppointmentStatus, EBranch } from '../enum/appointment';
import { Transform } from 'class-transformer';
import { transformDateToISOString } from '../../../utils/common.helper';
import { EDentalService } from '../enum/appointment';
import { IntraoralExam } from 'src/intraoral-exam/entity/intraoral-exam';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid', nullable: true })
  patient_id: string | null;

  @ManyToOne(() => Patient, (patient) => patient.appointments, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient | null;

  // Renamed from branch_id — it's a fixed enum value, not a foreign key.
  @Column({ type: 'varchar', length: 20 })
  branch: EBranch;

  // Renamed from date — now stores exact date AND time.
  @Column({ type: 'timestamptz', name: 'scheduled_at' })
  scheduled_at: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  service: string | null;

  @Column({
    name: 'service_other',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  service_other: string | null;

  @Column({ name: 'service_type', type: 'varchar', length: 30, nullable: true })
  service_type: string | null;

  @Column({ name: 'treatment_done', type: 'text', nullable: true })
  treatment_done: string | null;

  @Column({
    name: 'amount_charge',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  amount_charge: number;

  @Column({
    name: 'base_charge',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  base_charge: number;

  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  amount_paid: number;

  // Read-only from the app side — maintained by DB triggers.
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  // appointment.entity.ts — remove the noShow @Column entirely, add:
  @Column({
    name: 'appointment_status',
    type: 'varchar',
    length: 20,
    default: EAppointmentStatus.SCHEDULED,
  })
  appointment_status!: EAppointmentStatus;

  @OneToMany(() => IntraoralExam, (exam) => exam.appointment)
  intraoral_exams: IntraoralExam[];

  @OneToMany(() => Payment, (payment) => payment.appointment)
  payments: Payment[];

  @CreateDateColumn({ name: 'created_at' })
  @Transform(transformDateToISOString)
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @Transform(transformDateToISOString)
  updated_at: Date;
}
