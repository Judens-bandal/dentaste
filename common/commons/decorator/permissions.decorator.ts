import { SetMetadata } from '@nestjs/common';
import { EPermissions } from '../../../utils/common.enum';

export const PER_KEY = 'permissions';

export const Permission = (...permissions: EPermissions[]) =>
  SetMetadata(PER_KEY, permissions);
