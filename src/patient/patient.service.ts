import { HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Patient } from './entity/patient';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ICustomRequest,
  IPatient,
  IPatientRecord,
  IResponse,
} from '../../utils/common.interface';
import { Response } from 'express';
import { ErrorCode } from '../../utils/common.enum';
import {
  expressResponse,
  extractUser,
  formatDateTime,
} from '../../utils/common.helper';
import {
  CreatePatientDto,
  GetPatientDto,
  UpdatePatientDto,
} from './dto/patient';
import { patientKey, patientRecordKey, patientsKey } from '../redis/redis.keys';
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
        order: { last_name: 'ASC', first_name: 'ASC' },
      });

      const patientIds = patient
        .map((entry) => entry.id)
        .filter((id): id is string => !!id);

      const serviceMap = new Map<
        string,
        {
          service: string[] | null;
          service_type: string[] | null;
          services: Array<{
            service: string;
            service_type?: string | null;
            service_other?: string | null;
          }>;
        }
      >();

      if (patientIds.length > 0) {
        const result = await this.patientRepository.query(
          `
            SELECT
              patient_id,
              COALESCE(
                ARRAY_AGG(DISTINCT service_entry->>'service')
                  FILTER (WHERE NULLIF(service_entry->>'service', '') IS NOT NULL),
                ARRAY[]::text[]
              ) AS service,
              COALESCE(
                ARRAY_AGG(DISTINCT service_entry->>'service_type')
                  FILTER (WHERE NULLIF(service_entry->>'service_type', '') IS NOT NULL),
                ARRAY[]::text[]
              ) AS service_type,
              COALESCE(JSONB_AGG(DISTINCT service_entry), '[]'::jsonb) AS services
            FROM (
              SELECT a.patient_id, entry AS service_entry
              FROM appointments a
              INNER JOIN intraoral_exams ie ON ie.appointment_id = a.id
              CROSS JOIN LATERAL jsonb_array_elements(
                CASE
                  WHEN jsonb_typeof(ie.services) = 'array' THEN ie.services
                  ELSE '[]'::jsonb
                END
              ) AS entry
              WHERE a.patient_id = ANY($1)

              UNION ALL

              SELECT
                a.patient_id,
                jsonb_build_object(
                  'service', a.service,
                  'service_type', NULLIF(a.service_type, ''),
                  'service_other', a.service_other
                ) AS service_entry
              FROM appointments a
              WHERE a.patient_id = ANY($1)
                AND a.service IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM intraoral_exams ie
                  WHERE ie.appointment_id = a.id
                    AND jsonb_typeof(ie.services) = 'array'
                    AND jsonb_array_length(ie.services) > 0
                )
            ) AS patient_service_entries
            GROUP BY patient_id
          `,
          [patientIds],
        );

        for (const row of result) {
          serviceMap.set(row.patient_id, {
            service: row.service ?? null,
            service_type: row.service_type ?? null,
            services: row.services ?? [],
          });
        }
      }

      const patientsWithServices = patient.map((entry) => ({
        ...entry,
        ...(entry.id
          ? (serviceMap.get(entry.id) ?? {
              service: null,
              service_type: null,
              services: [],
            })
          : { service: null, service_type: null, services: [] }),
      }));

      await this.redis.set(cachekey, patientsWithServices, PATIENT_TTL);

      response.data = { code: 0, data: patientsWithServices };
      response.code = HttpStatus.OK;
    } catch (error) {
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async getPatientRecord(
    dto: GetPatientDto,
    req: ICustomRequest,
    res: Response,
  ) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req);

      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      // const cachekey = patientRecordKey(dto.id);
      // const cacheData = await this.redis.get<IPatientRecord[]>(cachekey);
      // if (cacheData) {
      //   response.data = { code: 0, data: cacheData };
      //   response.code = HttpStatus.OK;
      //   return;
      // }
      const query = `
        SELECT
          p.last_name,
          p.first_name,
          p.age,
          p.sex,
          a.scheduled_at AS scheduled_at,
          COALESCE(
            (
              SELECT jsonb_agg(elem)
              FROM intraoral_exams ie,
                  jsonb_array_elements(ie.tooth_records) AS elem
              WHERE ie.appointment_id = a.id
                AND ie.tooth_records IS NOT NULL
            )::text,
            'N/A'
          ) AS tooth_records,
          a.service,
          a.service_type,
          (
            SELECT JSONB_AGG(entry_row)
            FROM (
              SELECT jsonb_build_object(
                'service', a.service,
                'service_type', NULLIF(a.service_type, ''),
                'service_other', a.service_other,
                'amount_charge', COALESCE(a.base_charge, a.amount_charge),
                'tooth_records', COALESCE(
                  (SELECT ie.tooth_records
                  FROM intraoral_exams ie
                  WHERE ie.appointment_id = a.id
                  ORDER BY ie.created_at ASC
                  LIMIT 1),
                  '[]'::jsonb
                )
              ) AS entry_row
              WHERE a.service IS NOT NULL
                AND (
                  COALESCE(a.base_charge, a.amount_charge, 0) > 0
                  OR NOT EXISTS (
                    SELECT 1
                    FROM intraoral_exams existing_exam
                    WHERE existing_exam.appointment_id = a.id
                      AND jsonb_array_length(
                        CASE
                          WHEN jsonb_typeof(existing_exam.services) = 'array'
                            THEN existing_exam.services
                          ELSE '[]'::jsonb
                        END
                      ) > 0
                  )
                )

              UNION ALL

              -- intraoral exam services
              SELECT (
                service_entry || jsonb_build_object(
                  'tooth_records', COALESCE(ie.tooth_records, '[]'::jsonb)
                )
              ) AS entry_row
              FROM intraoral_exams ie
              CROSS JOIN LATERAL jsonb_array_elements(
                CASE
                  WHEN jsonb_typeof(ie.services) = 'array' THEN ie.services
                  ELSE '[]'::jsonb
                END
              ) AS service_entry
              WHERE ie.appointment_id = a.id
            ) AS all_entries
          ) AS services,
          a.branch,
          a.amount_charge,
          payment_summary.amount_paid,
          a.balance,
          
          CASE 
            WHEN a.appointment_status = 'SCHEDULED' AND COALESCE(a.amount_charge, 0) <= 0 THEN 'PENDING'
            WHEN a.balance = 0 AND payment_summary.amount_paid > 0 THEN 'PAID'
            WHEN a.balance > 0 AND payment_summary.amount_paid > 0 THEN 'PARTIAL PAYMENT'
            WHEN a.appointment_status = 'SCHEDULED' THEN 'SCHEDULED'
            ELSE a.appointment_status
          END AS status,
          
          payment_summary.date_paid,
          
          (SELECT a_next.scheduled_at
          FROM appointments a_next
          WHERE a_next.patient_id = p.id
            AND a_next.scheduled_at > NOW()
            AND a_next.appointment_status = 'SCHEDULED'
          ORDER BY
            a_next.scheduled_at ASC,
            a_next.id ASC
          LIMIT 1) AS next_appt_date,
          
          (SELECT CASE
            WHEN a_next.service = 'other'
              THEN COALESCE(NULLIF(TRIM(a_next.service_other), ''), a_next.service)
            ELSE a_next.service
          END
          FROM appointments a_next
          WHERE a_next.patient_id = p.id
            AND a_next.scheduled_at > NOW()
            AND a_next.appointment_status = 'SCHEDULED'
          ORDER BY
            a_next.scheduled_at ASC,
            a_next.id ASC
          LIMIT 1) AS next_appt_procedure

        FROM patients p
        
        INNER JOIN appointments a 
          ON a.patient_id = p.id

        LEFT JOIN LATERAL (
          SELECT
            COALESCE(SUM(payment.amount_paid), 0) AS amount_paid,
            MAX(payment.date_paid) AS date_paid
          FROM payments payment
          WHERE payment.appointment_id = a.id
        ) payment_summary ON TRUE
        
        WHERE
          p.id = $1
          AND (
            (a.appointment_status = 'SCHEDULED' AND a.balance > 0)
            OR (a.balance > 0 AND a.amount_paid > 0)
            OR (a.balance = 0)
          )
        
        ORDER BY a.scheduled_at DESC;
      `;

      const rawData: IPatientRecord[] = await this.patientRepository.query(
        query,
        [dto.id],
      );
      const data = rawData.map((record) => ({
        ...record,
        scheduled_at: formatDateTime(record.scheduled_at),
        next_appt_date: record.next_appt_date
          ? formatDateTime(record.next_appt_date)
          : null,
      }));

      // await this.redis.set(cachekey, data);

      response.data = { code: 0, data };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error fetching patient record:', error);
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
