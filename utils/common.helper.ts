import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { classToPlain, TransformFnParams } from 'class-transformer';
import { ICustomRequest, IResponse } from './common.interface';
import { Response } from 'express';
import { ERole, ErrorCode } from './common.enum';
import { BadRequestException } from '@nestjs/common';
import { EBranch, EStatus } from '../src/appointment/enum/appointment';
import { Repository } from 'typeorm';
import { Appointment } from '../src/appointment/entity/appointment';
import {
  PATIENT_CONFLICT_BUFFER_MINUTES,
  SCHEDULE_CONFLICT_BUFFER_MINUTES,
} from './common.constant';

export function transformDateToISOString({
  value,
}: TransformFnParams): unknown {
  const input = value as unknown;
  if (input == null) {
    return input;
  }

  let date: Date | null;
  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'string' || typeof input === 'number') {
    date = new Date(input);
  } else {
    date = null;
  }

  if (date === null || Number.isNaN(date.getTime())) {
    return input;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// export function extractUser(req: ICustomRequest, dto?: { id?: string } | null) {
//   const role = req?.claims?.role ?? req?.user?.role;
//   const dtoId =
//     dto && typeof dto === 'object' && 'id' in dto ? dto.id : undefined;
//   const requestUserId = req?.claims?.id ?? req?.user?.id;
//   const fallbackId = dtoId != null ? Number(dtoId) : requestUserId;

//   if (role === ERole.ADMIN || role === ERole.DOCTOR) {
//     return { role, id: fallbackId != null ? Number(fallbackId) : null };
//   } else if (role === ERole.ASSISTANT) {
//     return { role, id: requestUserId != null ? Number(requestUserId) : null };
//   }

//   return { role, id: requestUserId != null ? Number(requestUserId) : null };
// }

export function extractUser(req: ICustomRequest, dto?: { id?: string } | null) {
  const role = req?.claims?.role ?? req?.user?.role;
  const dtoId =
    dto && typeof dto === 'object' && 'id' in dto ? dto.id : undefined;
  const requestUserId = req?.claims?.id ?? req?.user?.id;
  const fallbackId = dtoId ?? requestUserId;

  if (role === ERole.ADMIN || role === ERole.DOCTOR) {
    return { role, id: fallbackId ?? null };
  } else if (role === ERole.ASSISTANT) {
    return { role, id: requestUserId ?? null };
  }

  return { role, id: requestUserId ?? null };
}

export function expressResponse(res: Response, data: IResponse) {
  const transformed = classToPlain(data.data);
  return res.status(data.code).json(transformed);
}

export function parseToDatabaseDate(input: string | null) {
  if (!input) return null;

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseToDatabaseTime(input: string | null) {
  if (!input) return null;

  const parts = input.split(':');

  if (parts.length !== 2) return null;

  const [hh, mm] = parts;

  const hours = Number(hh);

  const minutes = Number(mm);

  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  )
    return null;

  return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00`;
}

export function IsCustomTime(options?: ValidationOptions) {
  return function (object: object, name: string) {
    registerDecorator({
      name: 'isCustomTime',
      target: object.constructor,
      propertyName: name,
      options: options,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          const regex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
          const test = regex.test(value);

          return test;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid time in HH:MM format`;
        },
      },
    });
  };
}

export function IsFutureDate(options?: ValidationOptions) {
  return function (object: object, name: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: name,
      options: options,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          const date = new Date(value);
          if (Number.isNaN(date.getTime())) {
            return false;
          }

          const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
          if (dateOnly) {
            const now = new Date();
            const todayUtc = Date.UTC(
              now.getUTCFullYear(),
              now.getUTCMonth(),
              now.getUTCDate(),
            );
            const valueUtc = Date.UTC(
              date.getUTCFullYear(),
              date.getUTCMonth(),
              date.getUTCDate(),
            );
            return valueUtc >= todayUtc;
          }

          return date.getTime() >= Date.now();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a future or present date-time`;
        },
      },
    });
  };
}

export function IsCustomDate(options?: ValidationOptions) {
  return function (object: object, name: string) {
    registerDecorator({
      name: 'isCustomDate',
      target: object.constructor,
      propertyName: name,
      options: options,
      validator: {
        validate(value: string, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          const regex = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

          if (!regex.test(value)) {
            return false;
          }

          const [year, month, day] = value.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          const pass =
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day;

          return pass;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid date in YYYY-MM-DD format`;
        },
      },
    });
  };
}

export function safeString(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function extractError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function safeParser<T>(value: unknown): T | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// common/utils/redis.helper.ts
export function compareStreamId(a: string, b: string): number {
  const [aMs, aSeq] = a.split('-').map(Number);
  const [bMs, bSeq] = b.split('-').map(Number);

  if (aMs !== bMs) return aMs - bMs;
  return (aSeq ?? 0) - (bSeq ?? 0);
}

export function isSecondWeekThursdayOrFriday(date: Date): boolean {
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay(); // Thu = 4, Fri = 5
  return (
    dayOfMonth >= 8 && dayOfMonth <= 14 && (dayOfWeek === 4 || dayOfWeek === 5)
  );
}

/**
 * Throws if someone tries to book a non-Calbayog branch on the
 * 2nd Thursday/Friday of the month, when only Calbayog is available.
 */
export function assertBranchAllowedForDate(date: Date, branch: EBranch): void {
  if (isSecondWeekThursdayOrFriday(date) && branch !== EBranch.CALBAYOG) {
    throw new BadRequestException({
      code: ErrorCode.BRANCH_NOT_ALLOWED_ON_DATE,
      message:
        'On the 2nd Thursday/Friday of the month, only Calbayog is available.',
    });
  }
}

export function formatDateTime(
  date: Date | string,
  timeZone = 'Asia/Manila',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  const period = get('dayPeriod').toLocaleUpperCase(); // "PM" -> "pm"

  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')} ${period}`;
}

// Throws if ANY branch already has an appointment within
// +/- SCHEDULE_CONFLICT_BUFFER_MINUTES of the requested time.
// Since one doctor serves all branches, two branches cannot have
// overlapping appointments regardless of which branch they are at.
export async function assertNoScheduleConflict(
  appointmentRepository: Repository<Appointment>,
  branch: EBranch,
  scheduledAt: string,
  excludeAppointmentId?: string,
): Promise<void> {
  const requestedTime = new Date(scheduledAt).getTime();
  const bufferMs = SCHEDULE_CONFLICT_BUFFER_MINUTES * 60 * 1000;

  const dayStart = new Date(scheduledAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(scheduledAt);
  dayEnd.setHours(23, 59, 59, 999);

  // no branch filter — one doctor serves all branches so any branch
  // having an appointment within the buffer window is a conflict
  const sameDayAllBranches = await appointmentRepository
    .createQueryBuilder('appointment')
    .andWhere('appointment.scheduled_at >= :dayStart', {
      dayStart: dayStart.toISOString(),
    })
    .andWhere('appointment.scheduled_at <= :dayEnd', {
      dayEnd: dayEnd.toISOString(),
    })
    .getMany();

  const conflict = sameDayAllBranches.find((existing) => {
    if (excludeAppointmentId && existing.id === excludeAppointmentId)
      return false;
    return (
      Math.abs(new Date(existing.scheduled_at).getTime() - requestedTime) <
      bufferMs
    );
  });

  if (conflict) {
    const isSameBranch = conflict.branch === branch;
    throw new BadRequestException({
      code: ErrorCode.SCHEDULE_CONFLICT,
      message: isSameBranch
        ? `${branch} already has an appointment within ${SCHEDULE_CONFLICT_BUFFER_MINUTES} minutes of this time.`
        : `${conflict.branch} already has an appointment within ${SCHEDULE_CONFLICT_BUFFER_MINUTES} minutes of this time — the doctor cannot be at two branches simultaneously.`,
    });
  }
}

// Throws if the SAME PATIENT already has an appointment within
// +/- PATIENT_CONFLICT_BUFFER_MINUTES of the requested time, AT ANY BRANCH.
// This is separate from assertNoScheduleConflict (which only checks
// per-branch capacity) — a patient can't physically be at two branches
// at once, regardless of whether each branch individually has room.
export async function assertNoPatientScheduleConflict(
  appointmentRepository: Repository<Appointment>,
  patientId: string,
  scheduledAt: string,
  excludeAppointmentId?: string,
): Promise<void> {
  const requestedTime = new Date(scheduledAt).getTime();
  const bufferMs = PATIENT_CONFLICT_BUFFER_MINUTES * 60 * 1000;

  const dayStart = new Date(scheduledAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(scheduledAt);
  dayEnd.setHours(23, 59, 59, 999);

  // narrow to this patient's same-day appointments across ALL branches
  // (no branch filter here — that's the whole point)
  const sameDayForPatient = await appointmentRepository
    .createQueryBuilder('appointment')
    .where('appointment.patient_id = :patientId', { patientId })
    .andWhere('appointment.scheduled_at >= :dayStart', {
      dayStart: dayStart.toISOString(),
    })
    .andWhere('appointment.scheduled_at <= :dayEnd', {
      dayEnd: dayEnd.toISOString(),
    })
    .getMany();

  const hasConflict = sameDayForPatient.some((existing) => {
    if (excludeAppointmentId && existing.id === excludeAppointmentId) {
      return false; // skip the appointment being updated against itself
    }
    const existingTime = new Date(existing.scheduled_at).getTime();
    return Math.abs(existingTime - requestedTime) < bufferMs;
  });

  if (hasConflict) {
    throw new BadRequestException({
      code: ErrorCode.PATIENT_SCHEDULE_CONFLICT,
      message: `This patient already has an appointment within ${PATIENT_CONFLICT_BUFFER_MINUTES} minutes of this time at another branch.`,
    });
  }
}

export function rangeValidator(
  from: Date | string | null,
  to: Date | string | null,
): boolean {
  if (!from || !to) return true; // nothing to validate if either side is missing

  const fromDate = new Date(from);
  const toDate = new Date(to);

  // explicitly reject invalid dates instead of relying on NaN comparisons
  // silently evaluating to false — this makes the failure reason clear
  // if you ever add validation error messages downstream
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return false;
  }

  return fromDate <= toDate;
}

// add to common.helper.ts, near parseToDatabaseDate

export interface IYearDateRange {
  year: string;
  is_current_year: EStatus;
  start_date: string;
  end_date: string;
}

/**
 * Resolves a target year (defaulting to the current year if omitted) into
 * a start/end date range, capping endDate at TODAY instead of Dec 31 when
 * the target year is the current one.
 */
export function getYearDateRange(year?: string): IYearDateRange {
  const now = new Date();

  // Always ensure the resolved year is a string
  const currentYear = String(extractYear(now));
  const resolvedYear = year ?? currentYear;

  const isCurrentYear = resolvedYear === currentYear;

  const start_date = parseToDatabaseDate(`${resolvedYear}-01-01`) as string;
  const end_date = isCurrentYear
    ? (parseToDatabaseDate(now.toISOString()) as string)
    : (parseToDatabaseDate(`${resolvedYear}-12-31`) as string);

  return {
    year: resolvedYear,
    is_current_year: isCurrentYear ? EStatus.ACTIVE : EStatus.INACTIVE,
    start_date,
    end_date,
  };
}

export const extractYear = (input: string | Date): number => {
  if (typeof input === 'string') {
    return Number(input.slice(0, 4));
  }
  return input.getUTCFullYear();
};
