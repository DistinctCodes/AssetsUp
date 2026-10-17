import { NotFoundException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';

describe('DepartmentsService (assets and users)', () => {
  let deptRepo: any;
  let assetRepo: any;
  let userRepo: any;
  let service: DepartmentsService;

  beforeEach(() => {
    deptRepo = { findOne: jest.fn().mockResolvedValue({ id: 'd-1' }) };
    assetRepo = { findAndCount: jest.fn() };
    userRepo = { findAndCount: jest.fn() };
    service = new DepartmentsService(deptRepo, assetRepo, userRepo);
  });

  it('lists a department\'s assets, paginated', async () => {
    assetRepo.findAndCount.mockResolvedValue([[{ id: 'a-1' }], 21]);
    const result = await service.findAssets('d-1', { page: 2, limit: 10 });
    expect(assetRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { departmentId: 'd-1' },
        skip: 10,
        take: 10,
      }),
    );
    expect(result).toMatchObject({ total: 21, totalPages: 3 });
  });

  it('returns an empty page for a department with no assets', async () => {
    assetRepo.findAndCount.mockResolvedValue([[], 0]);
    expect(await service.findAssets('d-1', {})).toMatchObject({
      items: [],
      total: 0,
    });
  });

  it('lists department users without selecting credential columns', async () => {
    userRepo.findAndCount.mockResolvedValue([[{ id: 'u-1' }], 1]);
    await service.findUsers('d-1', {});
    const args = userRepo.findAndCount.mock.calls[0][0];
    expect(args.where).toEqual({ departmentId: 'd-1' });
    expect(args.select).not.toContain('passwordHash');
    expect(args.select).not.toContain('refreshTokenHash');
    expect(args.select).not.toContain('passwordResetToken');
  });

  it('throws NotFoundException for an unknown department', async () => {
    deptRepo.findOne.mockResolvedValue(null);
    await expect(service.findAssets('x', {})).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.findUsers('x', {})).rejects.toThrow(NotFoundException);
  });
});
