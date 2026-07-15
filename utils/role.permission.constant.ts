// src/common/constants/role-permissions.constant.ts
import { EPermissions, ERole } from 'utils/common.enum';

export const DEFAULT_ROLE_PERMISSIONS: Record<ERole, EPermissions[]> = {
  [ERole.ADMIN]: Object.values(EPermissions), // full access

  [ERole.DOCTOR]: [
    EPermissions.VIEW_PATIENTS,
    EPermissions.MANAGE_PATIENTS,
    EPermissions.VIEW_APPOINTMENTS,
    EPermissions.MANAGE_APPOINTMENTS,
    EPermissions.VIEW_PAYMENTS,
    EPermissions.MANAGE_PAYMENTS,
    EPermissions.VIEW_REPORTS,
    EPermissions.VIEW_NOTIFICATIONS,
    EPermissions.MANAGE_NOTIFICATIONS,
    // doctors can grant/revoke permissions for assistants under them
    EPermissions.MANAGE_ASSISTANT_PERMISSIONS,
  ],

  // assistants start with zero permissions — a doctor or admin
  // must explicitly grant access via MANAGE_ASSISTANT_PERMISSIONS / MANAGE_PERMISSIONS
  [ERole.ASSISTANT]: [],
};
