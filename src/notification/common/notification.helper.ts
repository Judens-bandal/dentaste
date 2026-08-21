// import { Injectable, Inject, forwardRef } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { WebsocketService } from '../../websocket/websocket.service';
// import { User } from '../../auth/common/entity/user';
// import { ERole } from '../../../utils/common.enum';

// // ADMIN notifications — clinic-wide visibility across all branches
// export enum EAdminNotification {
//   USER_REGISTERED = 'New user registered',
//   USER_LOGIN = 'User login',
//   PATIENT_CREATED = 'New patient registered',
//   APPOINTMENT_CREATED = 'New appointment scheduled',
//   APPOINTMENT_UPDATED = 'Appointment updated',
//   APPOINTMENT_DELETED = 'Appointment deleted',
//   PAYMENT_RECEIVED = 'Payment received',
//   BRANCH_CONFLICT_ATTEMPT = 'Branch scheduling rule violated',
//   SCHEDULE_CONFLICT_ATTEMPT = 'Schedule conflict attempted',
//   AI_SETTINGS_UPDATED = 'AI settings updated',
// }

// // DOCTOR notifications — patients, payments, assistant management
// // (appointment-specific events live in EDoctorAppointmentNotification below)
// export enum EDoctorNotification {
//   PATIENT_CREATED = 'New patient registered',
//   PATIENT_UPDATED = 'Patient updated',
//   PATIENT_DELETED = 'Patient deleted',
//   PAYMENT_RECEIVED = 'Payment received for your appointment',
//   BALANCE_OUTSTANDING = 'Patient still has an outstanding balance',
//   ASSISTANT_PERMISSIONS_CHANGED = 'Assistant permissions updated',
// }

// // DOCTOR appointment notifications — the appointment lifecycle specifically
// export enum EDoctorAppointmentNotification {
//   APPOINTMENT_CREATED = 'New appointment scheduled',
//   APPOINTMENT_UPDATED = 'Appointment updated',
//   APPOINTMENT_DELETED = 'Appointment cancelled',
//   APPOINTMENT_NO_SHOW = 'Patient marked as no-show',
//   APPOINTMENT_REMINDER = 'Upcoming appointment reminder',
// }

// // ASSISTANT notifications — patients, payments, permissions
// // (appointment-specific events live in EAssistantAppointmentNotification below)
// export enum EAssistantNotification {
//   PAYMENT_RECORDED = 'Payment recorded',
//   PATIENT_CREATED = 'Patient registered',
//   PERMISSIONS_CHANGED = 'Your permissions were updated',
// }

// // ASSISTANT appointment notifications — the appointment lifecycle specifically
// export enum EAssistantAppointmentNotification {
//   APPOINTMENT_CREATED = 'Appointment scheduled',
//   APPOINTMENT_UPDATED = 'Appointment updated',
//   APPOINTMENT_DELETED = 'Appointment deleted',
//   APPOINTMENT_REMINDER = 'Upcoming appointment reminder',
// }

// // broadened to include every enum notify()/notifyDoctor()/notifyAssistant()
// // might actually be called with — previously this only listed the
// // non-appointment enums, so TypeScript rejected any appointment-lifecycle
// // notification passed through notifyDoctor/notifyAssistant.
// export type ENotificationType =
//   | EAdminNotification
//   | EDoctorNotification
//   | EDoctorAppointmentNotification
//   | EAssistantNotification
//   | EAssistantAppointmentNotification;

// @Injectable()
// export class NotificationHelper {
//   constructor(
//     @Inject(forwardRef(() => WebsocketService))
//     private readonly websocket: WebsocketService,

//     @InjectRepository(User, 'main_repo') // adjust connection name to match your setup
//     private readonly userRepo: Repository<User>,
//   ) {}

//   async notify(
//     id: string,
//     type: ENotificationType,
//     message: string,
//     extra?: Record<string, unknown>,
//   ): Promise<void> {
//     await this.websocket.publishNotification(id, {
//       notification_type: type,
//       message,
//       created_at: new Date().toISOString(),
//       ...extra,
//     });
//   }

//   // ── Admin (broadcast to every admin) ──────────────────
//   async notifyAdmins(
//     type: EAdminNotification,
//     message: string,
//     extra?: Record<string, unknown>,
//   ): Promise<void> {
//     const admins = await this.userRepo.find({
//       where: { role: ERole.ADMIN },
//       select: { id: true },
//     });

//     await Promise.all(
//       admins.map((admin) => this.notify(admin.id, type, message, extra)),
//     );
//   }

//   // ── Doctor (broadcast to every doctor) ────────────────
//   async notifyDoctors(
//     type: EDoctorNotification | EDoctorAppointmentNotification,
//     message: string,
//     extra?: Record<string, unknown>,
//   ): Promise<void> {
//     const doctors = await this.userRepo.find({
//       where: { role: ERole.DOCTOR },
//       select: { id: true },
//     });

//     await Promise.all(
//       doctors.map((doctor) => this.notify(doctor.id, type, message, extra)),
//     );
//   }

//   // ── Doctor (single, e.g. the doctor assigned to a specific appointment) ──
//   async notifyDoctor(
//     id: string,
//     type: EDoctorNotification | EDoctorAppointmentNotification,
//     message: string,
//     extra?: Record<string, unknown>,
//   ): Promise<void> {
//     await this.notify(id, type, message, extra);
//   }

//   // ── Assistant ────────────────────────────────────────
//   async notifyAssistant(
//     id: string,
//     type: EAssistantNotification | EAssistantAppointmentNotification,
//     message: string,
//     extra?: Record<string, unknown>,
//   ): Promise<void> {
//     await this.notify(id, type, message, extra);
//   }
// }

// // try

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebsocketService } from '../../websocket/websocket.service';
import { User } from '../../auth/common/entity/user';
import { ERole } from '../../../utils/common.enum';

export enum EAdminNotification {
  USER_REGISTERED = 'New user registered',
  USER_LOGIN = 'User login',
  PATIENT_CREATED = 'New patient registered',
  APPOINTMENT_CREATED = 'New appointment scheduled',
  APPOINTMENT_UPDATED = 'Appointment updated',
  APPOINTMENT_DELETED = 'Appointment deleted',
  PAYMENT_RECEIVED = 'Payment received',
  BRANCH_CONFLICT_ATTEMPT = 'Branch scheduling rule violated',
  SCHEDULE_CONFLICT_ATTEMPT = 'Schedule conflict attempted',
  AI_SETTINGS_UPDATED = 'AI settings updated',
}

export enum EDoctorNotification {
  TOOTH_RECORD_UPDATED = 'Tooth record updated',
  INTRAORAL_EXAM_CREATED = 'Intraoral exam created',
  PATIENT_CREATED = 'New patient registered',
  PATIENT_UPDATED = 'Patient updated',
  PATIENT_DELETED = 'Patient deleted',
  PAYMENT_RECEIVED = 'Payment received for your appointment',
  BALANCE_OUTSTANDING = 'Patient still has an outstanding balance',
  ASSISTANT_PERMISSIONS_CHANGED = 'Assistant permissions updated',
}

export enum EDoctorAppointmentNotification {
  APPOINTMENT_CREATED = 'New appointment scheduled',
  APPOINTMENT_UPDATED = 'Appointment updated',
  APPOINTMENT_DELETED = 'Appointment cancelled',
  APPOINTMENT_NO_SHOW = 'Patient marked as no-show',
  APPOINTMENT_REMINDER = 'Upcoming appointment reminder',
}

export enum EAssistantNotification {
  PAYMENT_RECORDED = 'Payment recorded',
  PATIENT_CREATED = 'Patient registered',
  PERMISSIONS_CHANGED = 'Your permissions were updated',
}

export enum EAssistantAppointmentNotification {
  APPOINTMENT_CREATED = 'Appointment scheduled',
  APPOINTMENT_UPDATED = 'Appointment updated',
  APPOINTMENT_DELETED = 'Appointment deleted',
  APPOINTMENT_REMINDER = 'Upcoming appointment reminder',
}

export type ENotificationType =
  | EAdminNotification
  | EDoctorNotification
  | EDoctorAppointmentNotification
  | EAssistantNotification
  | EAssistantAppointmentNotification;

@Injectable()
export class NotificationHelper {
  constructor(
    @Inject(forwardRef(() => WebsocketService))
    private readonly websocket: WebsocketService,

    @InjectRepository(User, 'main_repo')
    private readonly userRepo: Repository<User>,
  ) {}

  async notify(
    id: string,
    type: ENotificationType,
    message: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await this.websocket.publishNotification(id, {
      notification_type: type,
      message,
      created_at: new Date().toISOString(),
      ...extra,
    });
  }

  async notifyAdmins(
    type: EAdminNotification,
    message: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    const admins = await this.userRepo.find({
      where: { role: ERole.ADMIN },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) => this.notify(admin.id, type, message, extra)),
    );
  }

  async notifyDoctors(
    type: EDoctorNotification | EDoctorAppointmentNotification,
    message: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    const doctors = await this.userRepo.find({
      where: { role: ERole.DOCTOR },
      select: { id: true },
    });

    await Promise.all(
      doctors.map((doctor) => this.notify(doctor.id, type, message, extra)),
    );
  }

  async notifyDoctor(
    id: string,
    type: EDoctorNotification | EDoctorAppointmentNotification,
    message: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await this.notify(id, type, message, extra);
  }

  async notifyAssistant(
    id: string,
    type: EAssistantNotification | EAssistantAppointmentNotification,
    message: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await this.notify(id, type, message, extra);
  }

  // 🎯 Added bridge method to forward direct emits to WebsocketService
  emitToUser(userId: string, event: string, data: any) {
    if (
      this.websocket &&
      typeof (this.websocket as any).emitToUser === 'function'
    ) {
      (this.websocket as any).emitToUser(userId, event, data);
    } else if ((this.websocket as any).server) {
      (this.websocket as any).server.to(`user_${userId}`).emit(event, data);
    }
  }
}
