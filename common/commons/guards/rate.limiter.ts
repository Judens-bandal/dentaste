import { ExecutionContext, Injectable } from '@nestjs/common';
import {
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';
import { ErrorCode } from '../../../utils/common.enum';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const retryAfterSeconds = Math.ceil(throttlerLimitDetail.ttl / 1000);

    return Promise.reject(
      new ThrottlerException({
        code: ErrorCode.TOO_MANY_REQUESTS,
        message: `Too many requests. Try again in ${retryAfterSeconds}s.`,
      } as any),
    );
  }
}
