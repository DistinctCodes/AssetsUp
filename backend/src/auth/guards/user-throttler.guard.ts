import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { User } from '../../users/user.entity';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request & { user?: User }): Promise<string> {
    // Use user ID as throttle key when authenticated, fall back to IP
    return req.user?.id ?? req.ip ?? 'anonymous';
  }
}
