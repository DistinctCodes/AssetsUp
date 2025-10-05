/* eslint-disable prettier/prettier */
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysController } from './api-key.controller';
import { ApiKeysService } from './api-key.service';
import { ApiKey } from './entities/api-key.entity';
import { Company } from 'src/companies/entities/company.entity';
import { ApiKeyMiddleware } from './middleware/api-key.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, Company])],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiKeyMiddleware).forRoutes('*'); // apply globally or restrict to certain routes
  }
}
