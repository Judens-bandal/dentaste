import { HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Patient } from './entity/patient';
import { InjectRepository } from '@nestjs/typeorm';
import { ICustomRequest, IResponse } from '../../utils/common.interface';
import { Response } from 'express';
import { ErrorCode } from '../../utils/common.enum';
import { expressResponse, extractUser } from '../../utils/common.helper';
import { CreatePatientDto } from './dto/patient';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient, 'main_repo')
    private readonly patientRepository: Repository<Patient>,
  ) {}

  async addPatient(dto: CreatePatientDto, req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req, dto);

      if (!id) {
        response.data = { code: ErrorCode.NO_PERMISSION };
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
