import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from 'testcontainers';
import { DataSource } from 'typeorm';
import { AssetsService } from '../src/assets/assets.service';
import { Asset } from '../src/assets/entities/asset.entity';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';
import { FileService } from '../src/files/file.service';
import { AssetCodeGeneratorService } from '../src/assets/services/asset-code-generator.service';

describe('AssetsService Integration (Postgres)', () => {
  let container: StartedPostgreSqlContainer;
  let service: AssetsService;
  let dataSource: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:15-alpine').start();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getPort(),
          username: container.getUsername(),
          password: container.getPassword(),
          database: container.getDatabase(),
          entities: [Asset],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Asset]),
      ],
      providers: [
        AssetsService,
        { provide: AuditLogsService, useValue: { logAction: jest.fn() } },
        { provide: FileService, useValue: { uploadBuffer: jest.fn(), getPresignedUrl: jest.fn() } },
        { provide: AssetCodeGeneratorService, useValue: { generateQrCodeBuffer: jest.fn(), generateBarcodeBuffer: jest.fn() } },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    dataSource = module.get<DataSource>(DataSource);

    // Seed test records across two departments
    const repo = dataSource.getRepository(Asset);
    await repo.save([
      { name: 'Laptop A', assetTag: 'TAG-1', departmentId: 'dept-eng' },
      { name: 'Laptop B', assetTag: 'TAG-2', departmentId: 'dept-hr' },
    ]);
  }, 60000);

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  it('findAll - MANAGER should only see assets matching their department', async () => {
    const managerUser = { id: 'usr-m1', role: 'MANAGER', departmentId: 'dept-eng' };
    const results = await service.findAll({}, managerUser as any);

    expect(results.data).toHaveLength(1);
    expect(results.data[0].departmentId).toBe('dept-eng');
  });

  it('findAll - ADMIN should see all assets across all departments', async () => {
    const adminUser = { id: 'usr-a1', role: 'ADMIN' };
    const results = await service.findAll({}, adminUser as any);

    expect(results.data).toHaveLength(2);
  });
});