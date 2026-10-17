import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListAssetsQueryDto } from './list-assets-query.dto';

const check = async (input: Record<string, unknown>) =>
  validate(plainToInstance(ListAssetsQueryDto, input));

describe('ListAssetsQueryDto', () => {
  it('accepts a normal query', async () => {
    expect(
      await check({ page: '2', limit: '50', sortBy: 'name', sortOrder: 'ASC' }),
    ).toEqual([]);
  });

  it('rejects limit above 100 and page below 1', async () => {
    expect((await check({ limit: '101' })).length).toBeGreaterThan(0);
    expect((await check({ page: '0' })).length).toBeGreaterThan(0);
  });

  it('rejects non-whitelisted sort columns and directions', async () => {
    expect((await check({ sortBy: 'serialNumber; DROP' })).length).toBeGreaterThan(0);
    expect((await check({ sortOrder: 'sideways' })).length).toBeGreaterThan(0);
  });
});
