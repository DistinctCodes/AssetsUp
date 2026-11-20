import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { ListTransfersQueryDto } from './dto/list-transfers-query.dto';
import { TransferStatus } from './entities/asset-transfer.entity';

describe('transfers list filters', () => {
  it('filters the repository by requester and status', async () => {
    const repo: any = { findAndCount: jest.fn().mockResolvedValue([[], 0]) };
    const service = new TransfersService(repo, {} as any);

    await service.findAll({ page: 2, limit: 10, requestedByUserId: 'u-1', status: TransferStatus.PENDING });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requestedByUserId: 'u-1', status: 'PENDING' },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('applies no where clause without filters', async () => {
    const repo: any = { findAndCount: jest.fn().mockResolvedValue([[], 0]) };
    await new TransfersService(repo, {} as any).findAll({});
    expect(repo.findAndCount.mock.calls[0][0].where).toEqual({});
  });

  it('resolves "me" in the controller', () => {
    const service = { findAll: jest.fn() };
    const controller = new TransfersController(service as any);
    controller.findAll({ requestedByUserId: 'me', status: TransferStatus.PENDING } as any, { user: { id: 'u-7' } });
    expect(service.findAll).toHaveBeenCalledWith({ requestedByUserId: 'u-7', status: 'PENDING' });
  });

  it('validates the query DTO', async () => {
    expect(await validate(plainToInstance(ListTransfersQueryDto, { status: 'PENDING', requestedByUserId: 'me' }))).toHaveLength(0);
    expect((await validate(plainToInstance(ListTransfersQueryDto, { status: 'bogus' }))).length).toBeGreaterThan(0);
  });
});
