export enum ENotificationType {}

export enum ESocketEvent {
  NewNotification = 'new_notification',
  ConnectionStatus = 'connection_status',
}

export enum ERole {
  ASSISTANT = 'assistant',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
}

export enum EPermissions {
  MAINTENANCE_SETTINGS = 'SM',
  VIEW_PATIENTS = 'VPT',
  MANAGE_PATIENTS = 'MPT',
  VIEW_APPOINTMENTS = 'VAP',
  MANAGE_APPOINTMENTS = 'MA',
  VIEW_PAYMENTS = 'VPY',
  MANAGE_PAYMENTS = 'MPY',
  VIEW_PAYMENTS_TOTAL = 'VPTS',
  VIEW_REPORTS = 'VR',
  VIEW_NOTIFICATIONS = 'VN',
  MANAGE_NOTIFICATIONS = 'MN',
  MANAGE_AI_SETTINGS = 'MAI',
  MANAGE_USERS = 'MU',
  MANAGE_USERS_ADMIN_NOTIF = 'MUAN',
  MANAGE_PERMISSIONS = 'MP',
  MANAGE_ASSISTANT_PERMISSIONS = 'MAP',
}

export enum ErrorCode {
  // ==============================
  // SERVER (500000)
  // ==============================
  INTERNAL_SERVER_ERROR = 500001,
  TOO_MANY_LOGIN_ATTEMPTS = 50002,
  INVALID_DATE_RANGE = 50003,
  INVALID_SERVICE_TYPE = 50004,
  SYSTEM_MAINTENANCE = 50005,
  // ==============================
  // AUTHENTICATION (401000)
  // ==============================
  MISSING_AUTH_TOKEN = 401001,
  INVALID_AUTH_TOKEN = 401002,
  MISSING_ID = 401003,
  EXPIRED_AUTH_TOKEN = 401004,
  DIFFERENT_SESSION = 401005,

  // ==============================
  // PERMISSION / ACCESS (403000)
  // ==============================
  FORBIDDEN_PERMISSION = 403001,
  FORBIDDEN_ROLE = 403002,

  TOO_MANY_REQUESTS = 400058,

  // ==============================
  // DTO (400999)
  // ==============================
  DTO_VALIDATION_ERROR = 400999,
  MISSING_APPOINTMENT_ID = 400155,

  // ==============================
  // USER (400000)
  // ==============================
  INVALID_CREDENTIALS = 400001,
  USERNAME_ALREADY_EXIST = 400002,
  USER_NOT_FOUND = 400003,

  USER_CANNOT_DELETE_SELF = 400004,

  // ==============================
  // USER PERMISSION (400050)
  // ==============================
  PERMISSION_ALREADY_GRANTED = 400051,
  NO_PERMISSION = 400054,
  PERMISSION_NOT_GRANTED = 400052,
  INVALID_PERMISSION_FOR_ROLE = 400053,

  // ==============================
  // BRANCH (400100)
  // ==============================
  BRANCH_NOT_FOUND = 400101,
  BRANCH_ALREADY_EXIST = 400102,
  BRANCH_HAS_ASSIGNED_APPOINTMENTS = 400103,
  BRANCH_NOT_ALLOWED_ON_DATE = 4000104,
  SCHEDULE_CONFLICT = 4000105,

  // ==============================
  // PATIENT (400150)
  // ==============================
  PATIENT_NOT_FOUND = 400151,
  PATIENT_ALREADY_EXIST = 400152,
  PATIENT_SCHEDULE_CONFLICT = 400153,

  // ==============================
  // APPOINTMENT (400200)
  // ==============================
  APPOINTMENT_NOT_FOUND = 400201,
  APPOINTMENT_PATIENT_MISMATCH = 400202,
  APPOINTMENT_BRANCH_MISMATCH = 400203,
  APPOINTMENT_DATE_INVALID = 400204,
  APPOINTMENT_ALREADY_MARKED_NO_SHOW = 400205,
  LOCK_BUSY = 40000,
  STATUS_NOT_MANUALLY_SETTABLE = 4000206,
  // ==============================
  // PAYMENT (400250)
  // ==============================
  PAYMENT_NOT_FOUND = 400251,
  PAYMENT_APPOINTMENT_NOT_FOUND = 400252,
  PAYMENT_EXCEEDS_DEBIT_AMOUNT = 400253,
  PAYMENT_EXCEEDS_BALANCE = 400254,
  CHARGE_NOT_SET = 400255,

  // ==============================
  // AI SETTINGS (400300)
  // ==============================
  AI_SETTING_NOT_FOUND = 400301,
  AI_SETTING_PROVIDER_ALREADY_EXIST = 400302,
  AI_SETTING_INACTIVE = 400303,

  // ==============================
  // NOTIFICATION (400350)
  // ==============================
  NOTIFICATION_NOT_FOUND = 400351,

  // ==============================
  // REVENUE REPORT (400400)
  // ==============================
  REVENUE_REPORT_NOT_FOUND = 400401,
  REVENUE_REPORT_ALREADY_EXIST = 400402,
}
