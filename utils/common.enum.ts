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
  VIEW_PATIENTS = 'VPT',
  MANAGE_PATIENTS = 'MPT',
  VIEW_APPOINTMENTS = 'VAP',
  MANAGE_APPOINTMENTS = 'MAP',
  VIEW_PAYMENTS = 'VPY',
  MANAGE_PAYMENTS = 'MPY',
  VIEW_REPORTS = 'VR',
  VIEW_NOTIFICATIONS = 'VN',
  MANAGE_NOTIFICATIONS = 'MN',
  MANAGE_AI_SETTINGS = 'MAI',
}

export enum ErrorCode {
  // ==============================
  // SERVER (500000)
  // ==============================
  INTERNAL_SERVER_ERROR = 500001,

  // ==============================
  // AUTHENTICATION (401000)
  // ==============================
  MISSING_AUTH_TOKEN = 401001,
  INVALID_AUTH_TOKEN = 401002,
  MISSING_AUTH_CLAIMS = 401003,
  EXPIRED_AUTH_TOKEN = 401004,
  DIFFERENT_SESSION = 401005,

  // ==============================
  // PERMISSION / ACCESS (403000)
  // ==============================
  FORBIDDEN_PERMISSION = 403001,
  FORBIDDEN_ROLE = 403002,

  // ==============================
  // DTO (400999)
  // ==============================
  DTO_VALIDATION_ERROR = 400999,

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
  PERMISSION_NOT_GRANTED = 400052,
  INVALID_PERMISSION_FOR_ROLE = 400053,

  // ==============================
  // BRANCH (400100)
  // ==============================
  BRANCH_NOT_FOUND = 400101,
  BRANCH_ALREADY_EXIST = 400102,
  BRANCH_HAS_ASSIGNED_APPOINTMENTS = 400103,

  // ==============================
  // PATIENT (400150)
  // ==============================
  PATIENT_NOT_FOUND = 400151,
  PATIENT_ALREADY_EXIST = 400152,

  // ==============================
  // APPOINTMENT (400200)
  // ==============================
  APPOINTMENT_NOT_FOUND = 400201,
  APPOINTMENT_PATIENT_MISMATCH = 400202,
  APPOINTMENT_BRANCH_MISMATCH = 400203,
  APPOINTMENT_DATE_INVALID = 400204,
  APPOINTMENT_ALREADY_MARKED_NO_SHOW = 400205,

  // ==============================
  // PAYMENT (400250)
  // ==============================
  PAYMENT_NOT_FOUND = 400251,
  PAYMENT_APPOINTMENT_NOT_FOUND = 400252,
  PAYMENT_EXCEEDS_DEBIT_AMOUNT = 400253,

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
