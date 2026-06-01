import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module';
import { DepartmentsModule } from './departments/departments.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { StellarModule } from './stellar/stellar.module';
import { MailerModule } from './mailer/mailer.module';
import { QueueModule } from './queue/queue.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    AssetsModule,
    DepartmentsModule,
    AuditModule,
    UsersModule,
    LocationsModule,
    MaintenanceModule,
    StellarModule,
    MailerModule,
    QueueModule,
    NotificationsModule,
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 10,
      verboseMemoryLeak: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
  ],
  exports: [
    AssetsModule,
    DepartmentsModule,
    AuditModule,
    UsersModule,
    LocationsModule,
    MaintenanceModule,
    StellarModule,
    MailerModule,
    QueueModule,
    NotificationsModule,
    EventEmitterModule,
  ],
})
export class OpsceModule {}