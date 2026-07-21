import { EAppointmentStatus, EPaymentStatus } from '../enum/appointment';

export function getAppointmentStatus(
  scheduledAt: string,
  currentStatus: EAppointmentStatus,
): EAppointmentStatus {
  // manually-set states are never overridden by time-based logic
  if (
    currentStatus === EAppointmentStatus.NO_SHOW ||
    currentStatus === EAppointmentStatus.CANCELLED
  ) {
    return currentStatus;
  }

  const isPast = new Date(scheduledAt).getTime() < Date.now();
  return isPast ? EAppointmentStatus.COMPLETED : EAppointmentStatus.SCHEDULED;
}

export function isAppointmentPastDue(
  scheduledAt: string,
  appointmentStatus: EAppointmentStatus,
): boolean {
  if (appointmentStatus !== EAppointmentStatus.SCHEDULED) return false;
  return new Date(scheduledAt).getTime() < Date.now();
}

// payment status — derived from balance vs debitAmount
export function getPaymentStatus(
  debitAmount: number,
  balance: number,
): EPaymentStatus {
  if (balance <= 0) return EPaymentStatus.PAID;
  if (balance < debitAmount) return EPaymentStatus.PARTIAL;
  return EPaymentStatus.UNPAID;
}
