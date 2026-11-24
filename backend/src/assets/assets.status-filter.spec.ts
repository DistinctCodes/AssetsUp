import 'reflect-metadata';
import { AssetLifecycleService, AssetStatus } from './asset-lifecycle.service';
import { AssetsService } from './assets.service';

function queryBuilderSpy() {
  const qb: any = {
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  return qb;
}

function serviceFor(qb: ReturnType<typeof queryBuilderSpy>) {
  return new AssetsService(
    { createQueryBuilder: jest.fn(() => qb) } as any,
    new AssetLifecycleService(),
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
}

describe('assets list: status filter', () => {
  const cases: Array<[string, AssetStatus]> = [
    ['AVAILABLE', AssetStatus.AVAILABLE],
    ['ACTIVE', AssetStatus.AVAILABLE],
    ['ASSIGNED', AssetStatus.ASSIGNED],
    ['IN_MAINTENANCE', AssetStatus.IN_MAINTENANCE],
    ['MAINTENANCE', AssetStatus.IN_MAINTENANCE],
    ['IN_TRANSIT', AssetStatus.IN_TRANSIT],
    ['RETIRED', AssetStatus.RETIRED],
    ['DISPOSED', AssetStatus.DISPOSED],
    ['LOST', AssetStatus.LOST],
  ];

  it.each(cases)(
    'filters on the canonical status for input %s',
    async (input, expected) => {
      const qb = queryBuilderSpy();
      await serviceFor(qb).findAll({ status: input });
      expect(qb.andWhere).toHaveBeenCalledWith('asset.status = :st', {
        st: expected,
      });
    },
  );

  it('adds no status condition when the filter is absent', async () => {
    const qb = queryBuilderSpy();
    await serviceFor(qb).findAll({});
    expect(qb.andWhere).not.toHaveBeenCalledWith(
      expect.stringContaining('asset.status'),
      expect.anything(),
    );
  });

  it('rejects an unknown status instead of querying with it', async () => {
    const qb = queryBuilderSpy();
    await expect(serviceFor(qb).findAll({ status: 'ARCHIVED' })).rejects.toThrow(
      /Invalid asset status/,
    );
    expect(qb.andWhere).not.toHaveBeenCalled();
  });
});
