import { EPaymentStatus } from '../enum/appointment';
import { getPaymentStatus } from './appointment.helper';

describe('getPaymentStatus', () => {
  it('returns pending when no charge exists, even with a zero balance', () => {
    expect(getPaymentStatus(0, 0)).toBe(EPaymentStatus.PENDING);
  });

  it('returns paid when a positive charge has no balance', () => {
    expect(getPaymentStatus(100, 0)).toBe(EPaymentStatus.PAID);
  });

  it('returns partial when some balance has been paid', () => {
    expect(getPaymentStatus(100, 40)).toBe(EPaymentStatus.PARTIAL);
  });

  it('returns unpaid when the full charge remains', () => {
    expect(getPaymentStatus(100, 100)).toBe(EPaymentStatus.UNPAID);
  });
});
