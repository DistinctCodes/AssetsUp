import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssetStatusInput } from '../asset-lifecycle.service';
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

  it('accepts every canonical status and the ACTIVE/MAINTENANCE aliases', async () => {
    for (const status of Object.values(AssetStatusInput)) {
      expect(await check({ status })).toEqual([]);
    }
  });

  it('normalizes case and surrounding whitespace before validating status', async () => {
    const dto = plainToInstance(ListAssetsQueryDto, {
      status: ' in_maintenance ',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.status).toBe(AssetStatusInput.IN_MAINTENANCE);
  });

  it('rejects an unknown status', async () => {
    expect((await check({ status: 'ARCHIVED' })).length).toBeGreaterThan(0);
  });
});
