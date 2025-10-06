/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('schedule_settings')
export class ScheduleSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '0 0 * * *' }) // every day at midnight
  licenseCheckCron: string;

  @Column({ default: '0 8 * * *' }) // every day at 8am
  insuranceReminderCron: string;

  @Column({ default: '0 9 * * MON' }) // every Monday at 9am
  maintenanceCheckCron: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
