import { HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Patient } from './entity/patient';
import { InjectRepository } from '@nestjs/typeorm';
import { ICustomRequest, IResponse } from '../../utils/common.interface';
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
      const { id } = extractUser(req, dto);
      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }
      const cachekey = patientsKey();
      const cacheData = await this.redis.get<Patient[]>(cachekey);
      if (cacheData) {
        response.data = { code: 0, data: cacheData };
        response.code = HttpStatus.OK;
        return;
      }
      const patient = await this.patientRepository.find({
        select: {
          id: true,
          name: true,
          address: true,
          cellphoneNumber: true,
          age: true,
          occupation: true,
          status: true,
          createdAt: true,
          // updatedAt: true,
        },
      });
      await this.redis.set(cachekey, patient, PATIENT_TTL);

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
      const patient = this.patientRepository.create({
        name: dto.name,
        address: dto.address,
        cellphoneNumber: dto.cellphoneNumber,
        age: dto.age,
        occupation: dto.occupation,
        status: dto.status,
      });

      await this.patientRepository.save(patient);
      await this.redis.del(patientsKey());
      void this.notificationHelper.notifyDoctor(
        id,
        EDoctorNotification.PATIENT_CREATED,
        'A new patient has been added.',
        { name: patient.name },
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
        name: dto.name,
        address: dto.address,
        cellphoneNumber: dto.cellphoneNumber,
        age: dto.age,
        occupation: dto.occupation,
        status: dto.status,
      };

      await this.patientRepository.update({ id: dto.id }, patient);
      await this.redis.del(patientKey(id));
      await this.redis.del(patientsKey());
      void this.notificationHelper.notifyDoctor(
        id,
        EDoctorNotification.PATIENT_UPDATED,
        'New patient has been updated.',
        { name: patient.name },
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
        `A new patient, ${patient.name}, has been deleted.`,
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
