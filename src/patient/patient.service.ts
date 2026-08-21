import { HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Patient } from './entity/patient';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ICustomRequest,
  IPatient,
  IResponse,
} from '../../utils/common.interface';
import { Response } from 'express';
import { ErrorCode } from '../../utils/common.enum';
import { expressResponse, extractUser } from '../../utils/common.helper';
import {
  CreatePatientDto,
  GetPatientDto,
  UpdatePatientDto,
} from './dto/patient';
import { patientKey, patientsKey } from '../redis/redis.keys';
import { RedisCacheService } from '../redis/redis-cach.service';
import {
  EAdminNotification,
  EDoctorNotification,
  NotificationHelper,
} from '../notification/common/notification.helper';
import { PATIENT_TTL } from '../redis/redis.ttl';
import { DeleteAppointmentDto } from '../appointment/dto/appointment';
import { EPatientStatus } from './enum/enum';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient, 'main_repo')
    private readonly patientRepository: Repository<Patient>,
    private readonly redis: RedisCacheService,
    private readonly notificationHelper: NotificationHelper,
  ) {}

  async getAllPatients(dto: GetPatientDto, req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req);
      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }
      const cachekey = patientsKey();
      const cacheData = await this.redis.get<IPatient[]>(cachekey);
      if (cacheData) {
        response.data = { code: 0, data: cacheData };
        response.code = HttpStatus.OK;
        return;
      }
      const patient = await this.patientRepository.find({
        select: {
          id: true,
          last_name: true,
          first_name: true,
          middle_name: true,
          birthdate: true,
          age: true,
          sex: true,
          nickname: true,
          religion: true,
          nationality: true,
          address: true,
          home_no: true,
          office_no: true,
          fax_no: true,
          cellphone_number: true,
          email: true,
          occupation: true,
          dental_insurance: true,
          effective_date: true,
          parent_guardian_name: true,
          parent_occupation: true,
          referred_by: true,
          reason_for_consultation: true,
          prev_dentist: true,
          last_dental_visit: true,
          physician_name: true,
          physician_specialty: true,
          physician_office_address: true,
          physician_office_no: true,
          ar_gh: true,
          ar_umt: true,
          umt_cond: true,
          ar_sio: true,
          sio_detail: true,
          ar_hosp: true,
          hosp_detail: true,
          ar_med: true,
          med_detail: true,
          ar_tob: true,
          ar_drug: true,
          ar_all: true,
          allergies: true,
          allergy_others: true,
          bleeding_time: true,
          ar_preg: true,
          ar_nurs: true,
          ar_bcp: true,
          blood_type: true,
          blood_pressure: true,
          med_conds: true,
          med_conds_other: true,
          status: true,
          created_at: true,
          // updated_at: true,
        },
      });
      await this.redis.set(cachekey, patient, PATIENT_TTL);

      // void this.notificationHelper.notifyDoctors(
      //   id,
      //   EDoctorNotification.PATIENT_CREATED,
      //   'All patients have been fetched.',
      // );

      response.data = { code: 0, data: patient };
      response.code = HttpStatus.OK;
    } catch (error) {
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async addPatient(dto: CreatePatientDto, req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req, dto);

      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }
      // inside addPatient / updatePatient – map all new fields

      const patient = this.patientRepository.create({
        last_name: dto.last_name,
        first_name: dto.first_name,
        middle_name: dto.middle_name ?? null,
        birthdate: dto.birthdate ?? null,
        age: dto.age ?? null,
        sex: dto.sex ?? null,
        nickname: dto.nickname ?? null,
        religion: dto.religion ?? null,
        nationality: dto.nationality ?? null,
        address: dto.address ?? null,
        home_no: dto.home_no ?? null,
        office_no: dto.office_no ?? null,
        fax_no: dto.fax_no ?? null,
        cellphone_number: dto.cellphone_number ?? null,
        email: dto.email ?? null,
        occupation: dto.occupation ?? null,
        dental_insurance: dto.dental_insurance ?? null,
        effective_date: dto.effective_date ?? null,

        // minors
        parent_guardian_name: dto.parent_guardian_name ?? null,
        parent_occupation: dto.parent_occupation ?? null,
        referred_by: dto.referred_by ?? null,
        reason_for_consultation: dto.reason_for_consultation ?? null,

        // dental history
        prev_dentist: dto.prev_dentist ?? null,
        last_dental_visit: dto.last_dental_visit ?? null,

        // physician
        physician_name: dto.physician_name ?? null,
        physician_specialty: dto.physician_specialty ?? null,
        physician_office_address: dto.physician_office_address ?? null,
        physician_office_no: dto.physician_office_no ?? null,

        // yes/no (default 1 = No)
        ar_gh: dto.ar_gh ?? 1,
        ar_umt: dto.ar_umt ?? 1,
        umt_cond: dto.umt_cond ?? null,
        ar_sio: dto.ar_sio ?? 1,
        sio_detail: dto.sio_detail ?? null,
        ar_hosp: dto.ar_hosp ?? 1,
        hosp_detail: dto.hosp_detail ?? null,
        ar_med: dto.ar_med ?? 1,
        med_detail: dto.med_detail ?? null,
        ar_tob: dto.ar_tob ?? 1,
        ar_drug: dto.ar_drug ?? 1,
        ar_all: dto.ar_all ?? 1,
        allergies: dto.allergies ?? null,
        allergy_others: dto.allergy_others ?? null,
        bleeding_time: dto.bleeding_time ?? null,

        // women
        ar_preg: dto.ar_preg ?? null,
        ar_nurs: dto.ar_nurs ?? null,
        ar_bcp: dto.ar_bcp ?? null,

        // blood
        blood_type: dto.blood_type ?? null,
        blood_pressure: dto.blood_pressure ?? null,

        // conditions
        med_conds: dto.med_conds ?? null,
        med_conds_other: dto.med_conds_other ?? null,

        // existing
        status: dto.status ?? EPatientStatus.SINGLE,
      });

      await this.patientRepository.save(patient);
      await this.redis.del(patientsKey());
      void this.notificationHelper.notifyDoctor(
        id,
        EDoctorNotification.PATIENT_CREATED,
        'A new patient has been added.',
        {
          name:
            patient.last_name +
            ' ' +
            patient.first_name +
            ' ' +
            (patient.middle_name || ''),
        },
      );
      response.data = { code: 0, data: patient };
      response.code = HttpStatus.CREATED;
    } catch (error) {
      console.error('Error creating patient:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async updatePatient(
    dto: UpdatePatientDto,
    req: ICustomRequest,
    res: Response,
  ) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req, dto);

      if (!id) {
        response.data = { code: ErrorCode.NO_PERMISSION };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const patient_id = await this.patientRepository.findOne({
        where: { id },
      });

      if (!patient_id) {
        response.data = { code: ErrorCode.PATIENT_NOT_FOUND };
        response.code = HttpStatus.NOT_FOUND;
        return;
      }

      const patient: Partial<Patient> = {
        last_name: dto.last_name,
        first_name: dto.first_name,
        middle_name: dto.middle_name ?? null,
        birthdate: dto.birthdate ?? null,
        age: dto.age ?? null,
        sex: dto.sex ?? null,
        nickname: dto.nickname ?? null,
        religion: dto.religion ?? null,
        nationality: dto.nationality ?? null,
        address: dto.address ?? null,
        home_no: dto.home_no ?? null,
        office_no: dto.office_no ?? null,
        fax_no: dto.fax_no ?? null,
        cellphone_number: dto.cellphone_number ?? null,
        email: dto.email ?? null,
        occupation: dto.occupation ?? null,
        dental_insurance: dto.dental_insurance ?? null,
        effective_date: dto.effective_date ?? null,

        // minors
        parent_guardian_name: dto.parent_guardian_name ?? null,
        parent_occupation: dto.parent_occupation ?? null,
        referred_by: dto.referred_by ?? null,
        reason_for_consultation: dto.reason_for_consultation ?? null,

        // dental history
        prev_dentist: dto.prev_dentist ?? null,
        last_dental_visit: dto.last_dental_visit ?? null,

        // physician
        physician_name: dto.physician_name ?? null,
        physician_specialty: dto.physician_specialty ?? null,
        physician_office_address: dto.physician_office_address ?? null,
        physician_office_no: dto.physician_office_no ?? null,

        // yes/no (default 1 = No)
        ar_gh: dto.ar_gh ?? 1,
        ar_umt: dto.ar_umt ?? 1,
        umt_cond: dto.umt_cond ?? null,
        ar_sio: dto.ar_sio ?? 1,
        sio_detail: dto.sio_detail ?? null,
        ar_hosp: dto.ar_hosp ?? 1,
        hosp_detail: dto.hosp_detail ?? null,
        ar_med: dto.ar_med ?? 1,
        med_detail: dto.med_detail ?? null,
        ar_tob: dto.ar_tob ?? 1,
        ar_drug: dto.ar_drug ?? 1,
        ar_all: dto.ar_all ?? 1,
        allergies: dto.allergies ?? null,
        allergy_others: dto.allergy_others ?? null,
        bleeding_time: dto.bleeding_time ?? null,

        // women
        ar_preg: dto.ar_preg ?? null,
        ar_nurs: dto.ar_nurs ?? null,
        ar_bcp: dto.ar_bcp ?? null,

        // blood
        blood_type: dto.blood_type ?? null,
        blood_pressure: dto.blood_pressure ?? null,

        // conditions
        med_conds: dto.med_conds ?? null,
        med_conds_other: dto.med_conds_other ?? null,

        // existing
        status: dto.status ?? EPatientStatus.SINGLE,
      };

      await this.patientRepository.update({ id: dto.id }, patient);
      await this.redis.del(patientKey(id));
      await this.redis.del(patientsKey());
      void this.notificationHelper.notifyDoctor(
        id,
        EDoctorNotification.PATIENT_UPDATED,
        'New patient has been updated.',
        {
          name:
            patient.last_name +
            ' ' +
            patient.first_name +
            ' ' +
            (patient.middle_name || ''),
        },
      );
      response.data = { code: 0, data: patient };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error updating patient:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async deletePatient(dto: GetPatientDto, req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req, dto);

      if (!id) {
        response.data = { code: ErrorCode.NO_PERMISSION };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const patient = await this.patientRepository.findOne({
        where: { id },
      });

      if (!patient) {
        response.data = { code: ErrorCode.PATIENT_NOT_FOUND };
        response.code = HttpStatus.NOT_FOUND;
        return;
      }

      await this.patientRepository.delete({ id: dto.id });
      await this.redis.del(patientKey(id));
      await this.redis.del(patientsKey());

      // in PatientService.addPatient(), after saving
      void this.notificationHelper.notifyDoctor(
        id,
        EDoctorNotification.PATIENT_DELETED,
        `A new patient, ${patient.last_name} ${patient.first_name} ${patient.middle_name || ''}, has been deleted.`,
      );

      response.data = { code: 0 };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error deleting patient:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }
}

// export interface ICustomRequest extends Request {
//   claims?: IClaims;
//   user?: JwtPayload; // full payload, since Passport's validate() returns the whole thing
// }

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   async validate(payload: JwtPayload) {
//     return payload; // whatever you return here becomes req.user
//   }
// }
