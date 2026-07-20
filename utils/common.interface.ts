import { Request } from 'express';
import { EPermissions, ERole } from './common.enum';
import { JwtPayload } from '../src/auth/common/jwt-payload.interface';
import { EPatientStatus } from '../src/patient/enum/enum';

export interface IClaims {
  id: string;
  name: string;
  username: string;
  role: ERole;
  permissions: EPermissions[];
  iat?: number;
  exp?: number;
}

// export interface ICustomRequest extends Request {
//   claims?: IClaims;
//   user?: {
//     id?: string;
//     role?: ERole;
//   };
// }

export interface ICustomRequest extends Request {
  claims?: IClaims;
  user?: JwtPayload;
}

export interface INotification {
  notification_type: string;
  message: string;
  read: number;
  created_at?: string;
  [key: string]: unknown;
}
export interface IResponse {
  code: number;
  data: Record<any, any> | null;
}

// export interface INotification {
//   notification_type: ENotificationType;
//   internal_data: string;
//   created_at: string;
//   created_by: number | string;
//   creator_role: EAppRole;
// }

export interface IAppointments {
  id: string;
  patient: {
    name: string;
    cellphoneNumber: string;
    address: string;
  };
  branch: string;
  treatmentDone: string;
  noShow: number;
  scheduledAt: string;
}

export interface IPatient {
  id?: string;

  name: string;

  address: string;

  cellphoneNumber: string;

  age: number;

  occupation: string;

  status: EPatientStatus;

  // appointments: Appointment[];
}
