import { EPermissions, ERole } from 'utils/common.enum';

export interface JwtPayload {
  name: string;
  username: string;
  role: ERole;
  id: string;
  permissions: EPermissions[];
}
