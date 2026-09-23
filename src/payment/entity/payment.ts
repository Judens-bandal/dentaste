// payments/payment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { EPaymentMode } from '../enum/payment';
import { Appointment } from '../../appointment/entity/appointment';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'appointment_id', type: 'uuid', nullable: true })
  appointment_id: string;

  @ManyToOne(() => Appointment, (appointment) => appointment.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ type: 'varchar', length: 20 })
  mode: EPaymentMode;

  @Column({ name: 'amount_paid', type: 'decimal', precision: 10, scale: 2 })
  amount_paid: number;

  @Column({ name: 'date_paid', type: 'date' })
  date_paid: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
