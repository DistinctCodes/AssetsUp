import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { InvitationsModule } from '../invitations/invitations.module';
import { CombinedAuthGuard } from './guards/combined-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  imports: [
    UsersModule,
    ApiKeysModule,
    InvitationsModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ApiKeyStrategy, CombinedAuthGuard, RolesGuard],
  exports: [AuthService, JwtModule, CombinedAuthGuard, RolesGuard],
})
export class AuthModule {}
