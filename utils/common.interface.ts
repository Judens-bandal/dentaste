import { Request } from 'express';
import { EPermissions, ERole } from './common.enum';
import { JwtPayload } from '../src/auth/common/jwt-payload.interface';
import { EPatientStatus } from '../src/patient/enum/enum';
import {
  EAppointmentStatus,
  EDentalService,
  EPaymentStatus,
} from '../src/appointment/enum/appointment';

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
  stream_id?: string;
  category: 'appointment' | 'other';
  message: string;
  read: number | boolean;
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

// export interface IAppointments {
//   id: string;
//   patient: {
//     name: string;
//     cellphoneNumber: string;
//     address: string;
//   };
//   branch: string;
//   treatmentDone: string;
//   noShow: number;
//   scheduledAt: string;
// }

// export interface IAppointments {
//   id: string;
//   patient: {
//     last_name: string;
//     first_name: string;
//     middle_name: string;
//     cellphone_number: string;
//     address: string;
//     occupation: string;
//     age: number;
//     complain: string;
//     status: EPatientStatus;
//   };
//   branch: string;
//   treatment_done: string;
//   scheduled_at: string;
//   debit_amount: number;
//   balance: number;
//   appointment_status: EAppointmentStatus;
//   payment_status: EPaymentStatus;
// }

export interface IAppointments {
  id: string;
  patient: {
    last_name: string;
    first_name: string;
    middle_name: string;
    cellphone_number: string;
    address: string;
    occupation: string;
    age: number;
    complain: string;
    status: EPatientStatus;
  };
  branch: string;
  service: EDentalService;
  service_type: string | null;
  treatment_done: string;
  scheduled_at: string;
  debit_amount: number;
  balance: number;
  appointment_status: EAppointmentStatus;
  payment_status: EPaymentStatus;
}

export interface IPatient {
  id?: string;

  name: string;

  address: string;

  cellphone_number: string;

  age: number;

  occupation: string;

  status: EPatientStatus;

  // appointments: Appointment[];
}

export interface IPayment {
  // id: string;
  appointment: {
    treatment_done: string;
    branch: string;
    patient: {
      name: string;
      cellphone_number: string;
      address: string;
    };
  };
  mode: string;
  amount_paid: number;
  date_paid: string;
  created_at: string;
}

export interface ITotalReceivedPayments {
  total_received: number;
  transaction_count: number;
  dateFrom: string;
  dateTo: string;
  branch: string;
}

export interface IFullyPaidAppointmentsTotal {
  fully_paid_total: number;
  appointment_count: number;
  date_from: string;
  date_to: string;
  branch: string;
}

export interface IBranchTotalReceived {
  branch: string;
  total_received: number;
  transaction_count: number;
}

export interface ITotalReceivedByBranch {
  date_from: string;
  date_to: string;
  branches: IBranchTotalReceived[];
  grand_total: number;
}

export interface IAnnualTotalReceived {
  year: string;
  branch: string;
  is_current_year?: number;
  total_received: number;
  transaction_count: number;
}
