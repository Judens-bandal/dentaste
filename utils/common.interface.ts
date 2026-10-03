import { Request } from 'express';
import { EPermissions, ERole } from './common.enum';
import { JwtPayload } from '../src/auth/common/jwt-payload.interface';
import {
  EAllergy,
  EMedicalCondition,
  EPatientStatus,
  ESex,
} from '../src/patient/enum/enum';
import {
  EAppointmentStatus,
  EBranch,
  EDentalService,
  EPaymentStatus,
  TAppointmentServiceEntry,
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

export interface IAppointment {
  id: string;
  patient_id: string;
  patient: {
    last_name: string;
    first_name: string;
    middle_name?: string | null;
    cellphone_number: string | null;
    address: string | null;
    occupation: string | null;
    age: number | null;
    status: EPatientStatus;
  };
  branch: EBranch;
  service: string | null;
  service_other: string | null;
  service_type: string | null;
  treatment_done: string | null;
  scheduled_at: string;
  amount_charger: number;
  balance: number;
  appointment_status: EAppointmentStatus;
  payment_status: EPaymentStatus;
  updated_at: string | null;
}

export type IAppointments = IAppointment;

export interface IPatient {
  id?: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string | null;
  birthdate?: string | null;
  age?: number | null;
  sex?: ESex | null;
  nickname?: string | null;
  religion?: string | null;
  nationality?: string | null;
  address?: string | null;
  home_no?: string | null;
  office_no?: string | null;
  fax_no?: string | null;
  cellphone_number?: string | null;
  email?: string | null;
  occupation?: string | null;
  dental_insurance?: string | null;
  effective_date?: string | null;
  parent_guardian_name?: string | null;
  parent_occupation?: string | null;
  referred_by?: string | null;
  reason_for_consultation?: string | null;
  prev_dentist?: string | null;
  last_dental_visit?: string | null;
  physician_name?: string | null;
  physician_specialty?: string | null;
  physician_office_address?: string | null;
  physician_office_no?: string | null;
  ar_gh?: number;
  ar_umt?: number;
  umt_cond?: string | null;
  ar_sio?: number;
  sio_detail?: string | null;
  ar_hosp?: number;
  hosp_detail?: string | null;
  ar_med?: number;
  med_detail?: string | null;
  ar_tob?: number;
  ar_drug?: number;
  ar_all?: number;
  allergies?: EAllergy[] | null;
  allergy_others?: string | null;
  bleeding_time?: string | null;
  ar_preg?: number | null;
  ar_nurs?: number | null;
  ar_bcp?: number | null;
  blood_type?: string | null;
  blood_pressure?: string | null;
  med_conds?: EMedicalCondition[] | null;
  med_conds_other?: string | null;
  status?: EPatientStatus;
  service?: string[] | null;
  service_type?: string[] | null;
  services?: Array<{
    service: string;
    service_type?: string | null;
    service_other?: string | null;
  }>;
}

export interface IPatientRecord {
  last_name: string;
  first_name: string;
  age: number;
  sex: string;
  scheduled_at: string;
  tooth_records: string;
  service: string;
  service_type: string;
  services?: Array<{
    service: string;
    service_type?: string | null;
    service_other?: string | null;
  }>;
  branch: string;
  amount_charge: number;
  amount_paid: number;
  balance: number;
  status: string;
  date_paid: string | null;
  next_appt_date: string | null;
  next_appt_procedure: string | null;
}

export interface IPayment {
  id: string;
  appointment: {
    service: string | null;
    service_other: string | null;
    service_type: string | null;
    treatment_done: string | null;
    branch: string | null;
    patient: {
      name: string;
      cellphone_number: string | null;
      address: string | null;
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
  from: string;
  to: string;
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
