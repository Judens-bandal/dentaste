export const PATIENT_TTL = 600; // 10 min — patient records change rarely
export const PAYMENTS_TTL = 180; // 3 min — actively checked right after recording a payment
export const APPOINTMENT_TTL = 180; // 3 min — changes constantly during business hours
export const USER_PROFILE_TTL = 1800; // 30 min — roles/permissions rarely change; shorten if instant permission revocation matters more than reduced DB load
export const SESSION_TTL = 86400; // 1 day — MUST match JWT expiry (see AuthService.login())
export const OTP_TTL = 120; // 2 min — standard OTP window
export const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days
export const JWT_VALIDATE_CACHE_TTL = 300; // 5 min — cache for JwtStrategy.validate(), separate from USER_PROFILE_TTL above
