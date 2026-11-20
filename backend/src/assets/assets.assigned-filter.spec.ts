import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';

function queryBuilderSpy() {
  const qb: any = {
    skip: jest.fn(() => qb),
    take: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    addOrderBy: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  return qb;
}

describe('assets list: assignedToId filter', () => {
  it('filters on the assignee column', async () => {
    const qb = queryBuilderSpy();
    const repo: any = { createQueryBuilder: jest.fn(() => qb) };
    const service = new AssetsService(repo, {} as any, {} as any, {} as any, {} as any, {} as any);

    await service.findAll({ assignedToId: 'u-1' });

    expect(qb.andWhere).toHaveBeenCalledWith('asset.assignedToUserId = :au', { au: 'u-1' });
  });

  it('adds no assignee condition when the filter is absent', async () => {
    const qb = queryBuilderSpy();
    const service = new AssetsService(
      { createQueryBuilder: () => qb } as any,
      {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    await service.findAll({});
    expect(qb.andWhere).not.toHaveBeenCalledWith(expect.stringContaining('assignedToUserId'), expect.anything());
  });

  it('accepts assignedToId in the query DTO', async () => {
    const dto = plainToInstance(ListAssetsQueryDto, { assignedToId: 'me' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.assignedToId).toBe('me');
  });
});

describe('AssetsController.findAll: assignedToId=me', () => {
  const build = () => {
    const service = { findAll: jest.fn().mockResolvedValue({ items: [] }) };
    return { controller: new AssetsController(service as any, {} as any, {} as any, {} as any), service };
  };

  it('resolves "me" to the caller', () => {
    const { controller, service } = build();
    controller.findAll({ assignedToId: 'me', page: 1 } as any, 'u-7');
    expect(service.findAll).toHaveBeenCalledWith({ assignedToId: 'u-7', page: 1 });
  });

  it('passes an explicit id through', () => {
    const { controller, service } = build();
    controller.findAll({ assignedToId: 'u-2' } as any, 'u-7');
    expect(service.findAll).toHaveBeenCalledWith({ assignedToId: 'u-2' });
  });
});
