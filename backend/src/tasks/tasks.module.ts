import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { Department } from '../users/entities/department.entity';
import { MailModule } from '../mail/mail.module';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Asset, Department]),
    MailModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}
