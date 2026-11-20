import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateMaintenanceStatusDto } from './update-maintenance-status.dto';

const check = (status: unknown) =>
  validate(plainToInstance(UpdateMaintenanceStatusDto, { status }));

describe('UpdateMaintenanceStatusDto', () => {
  it.each(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])(
    'accepts %s',
    async (status) => {
      expect(await check(status)).toHaveLength(0);
    },
  );

  it.each(['done', 'completed', '', undefined, 3])('rejects %p', async (status) => {
    expect((await check(status)).length).toBeGreaterThan(0);
  });
});
