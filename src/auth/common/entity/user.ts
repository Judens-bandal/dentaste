import { Exclude, Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { EPermissions, ERole } from '../../../../utils/common.enum';
import { transformDateToISOString } from '../../../../utils/common.helper';

@Entity('users')
@Unique(['username'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @IsEmail()
  @Column('varchar', { length: 20 })
  username: string;

  @Column('varchar', { length: 100 })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column('varchar', { length: 20 })
  name: string;

  @Column('enum', { enum: ERole, default: ERole.ASSISTANT })
  role: ERole;

  @Column({ type: 'json' })
  permissions: EPermissions[];

  @CreateDateColumn()
  @Transform(transformDateToISOString)
  created_at: Date;

  @UpdateDateColumn()
  @Transform(transformDateToISOString)
  updated_at: Date;
}
