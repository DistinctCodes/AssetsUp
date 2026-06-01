import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Add your custom logic here if needed
    // For example, you might want to handle different authentication strategies
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on either err/arg information
    if (err || !user) {
      throw err || new Error('Invalid token or user not found');
    }
    return user;
  }
}