const env = () => process.env.STAGE ?? 'dev';

// --- users ---
export const userKey = (id: string) => `${env()}:dentaste:user:${id}`;

export const usersKey = () => `${env()}:dentaste:users`;

export const userPermissionsKey = (id: string) =>
  `${env()}:dentaste:user:${id}:permissions`;

export const sessionKey = (id: string) => `${env()}:dentaste:session:${id}`;

// login lockout counter — matches the attemptsKey pattern from your AuthService
export const loginAttemptsKey = (username: string) =>
  `${env()}:dentaste:login-attempts:${username}`;

// --- patients ---
export const patientKey = (id: string) => `${env()}:dentaste:patient:${id}`;

export const patientsKey = () => `${env()}:dentaste:patients`;

export const patientsByStatusKey = (status: string) =>
  `${env()}:dentaste:patients:status:${status}`;

//---summary total
export const paymentsKey = () => `${env()}:dentaste:payments`;

export const totalReceivedKey = (
  dateFrom: string,
  dateTo: string,
  branch?: string,
) =>
  `${env()}:dentaste:payments:total_received:${dateFrom}:${dateTo}:${branch ?? 'ALL'}`;

// --- appointments ---

export const appointmentsKey = () => `${env()}:dentaste:appointments`;

export const appointmentKey = (id: string) =>
  `${env()}:dentaste:appointment:${id}`;

export const appointmentsByPatientKey = (patientId: string) =>
  `${env()}:dentaste:appointments:patient:${patientId}`;

export const appointmentsByBranchKey = (branch: string) =>
  `${env()}:dentaste:appointments:branch:${branch}`;

export const appointmentsByDateKey = (dateIso: string) =>
  `${env()}:dentaste:appointments:date:${dateIso}`;

// --- payments ---
export const paymentKey = (id: string) => `${env()}:dentaste:payment:${id}`;

export const paymentsByAppointmentKey = (appointmentId: string) =>
  `${env()}:dentaste:payments:appointment:${appointmentId}`;

// --- revenue reports ---
export const revenueReportKey = (month: number, year: number) =>
  `${env()}:dentaste:revenue-report:${year}:${month}`;

// --- ai settings ---
export const aiSettingKey = (provider: string) =>
  `${env()}:dentaste:ai-setting:${provider}`;

// --- action logs ---
export const actionLogsByEntityKey = (entityType: string, entityId: string) =>
  `${env()}:dentaste:action-logs:${entityType}:${entityId}`;

// --- notifications ---
export const userNotificationKey = (userId: string) =>
  `${env()}:dentaste:notifications:${userId}`;

export const readNotificationKey = (userId: string) =>
  `${env()}:dentaste:notifications:read:${userId}`;

export const unreadNotificationKey = (userId: string) =>
  `${env()}:dentaste:notifications:unread:${userId}`;
