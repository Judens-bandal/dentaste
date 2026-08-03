// patients/patient.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EPatientStatus } from '../enum/enum';

import { Transform } from 'class-transformer';
import { transformDateToISOString } from '../../../utils/common.helper';
import { Appointment } from '../../appointment/entity/appointment';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ name: 'cellphone_number', type: 'varchar', length: 20 })
  cellphone_number: string;

  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'varchar', length: 100 })
  occupation: string;

  @Column({ type: 'varchar', length: 20, default: EPatientStatus.NEW })
  status: EPatientStatus;

  @CreateDateColumn({ name: 'created_at' })
  @Transform(transformDateToISOString)
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @Transform(transformDateToISOString)
  updated_at: Date;

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments: Appointment[];
}
