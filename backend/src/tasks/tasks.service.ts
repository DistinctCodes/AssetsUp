import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { Department } from '../users/entities/department.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_WEEKDAY)
  async sendDepartmentAssetSummaries() {
    this.logger.log('Starting daily department asset summary task');
    const departments = await this.departmentRepository.find({ relations: ['children'] });
    for (const dept of departments) {
      const [assets, total] = await this.assetRepository.findAndCount({
        where: { departmentId: dept.id },
      });
      const active = assets.filter(a => a.status === 'ACTIVE').length;
      const assigned = assets.filter(a => a.status === 'ASSIGNED').length;
      const maintenance = assets.filter(a => a.status === 'MAINTENANCE').length;
      this.logger.log(`Department ${dept.name}: ${total} assets (${active} active, ${assigned} assigned, ${maintenance} maintenance)`);
    }
    this.logger.log('Daily department asset summary task completed');
  }

  @Cron('0 9 * * MON')
  async sendWeeklyAssetSummary() {
    this.logger.log('Starting weekly asset summary report');
    const totalAssets = await this.assetRepository.count();
    const statusCounts = await this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.status')
      .getRawMany();
    this.logger.log(`Weekly summary: ${totalAssets} total assets`);
    for (const row of statusCounts) {
      this.logger.log(`  ${row.status}: ${row.count}`);
    }
  }
}
