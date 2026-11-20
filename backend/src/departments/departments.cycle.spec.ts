import { BadRequestException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';

type Row = { id: string; parentDepartmentId?: string | null; name?: string; code?: string };

/** An in-memory department table: findOne by id, count of rows, save returns the row. */
function build(rows: Row[]) {
  const deptRepo = {
    findOne: jest.fn(({ where: { id } }) =>
      Promise.resolve(rows.find((r) => r.id === id) ?? null),
    ),
    count: jest.fn(() => Promise.resolve(rows.length)),
    save: jest.fn((d) => Promise.resolve(d)),
  };
  return {
    deptRepo,
    service: new DepartmentsService(deptRepo as any, {} as any, {} as any),
  };
}

describe('DepartmentsService.update parent cycles', () => {
  // A <- B <- C  (C's parent is B, B's parent is A)
  const tree = (): Row[] => [
    { id: 'A', parentDepartmentId: null, name: 'A', code: 'A' },
    { id: 'B', parentDepartmentId: 'A', name: 'B', code: 'B' },
    { id: 'C', parentDepartmentId: 'B', name: 'C', code: 'C' },
  ];

  it('rejects a department as its own parent', async () => {
    const { service } = build(tree());
    await expect(service.update('A', { parentDepartmentId: 'A' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects making a direct child the parent (A -> B -> A)', async () => {
    const { service, deptRepo } = build(tree());
    await expect(service.update('A', { parentDepartmentId: 'B' })).rejects.toThrow(
      /circular/,
    );
    expect(deptRepo.save).not.toHaveBeenCalled();
  });

  it('rejects making a deeper descendant the parent (A -> C)', async () => {
    const { service, deptRepo } = build(tree());
    await expect(service.update('A', { parentDepartmentId: 'C' })).rejects.toThrow(
      BadRequestException,
    );
    expect(deptRepo.save).not.toHaveBeenCalled();
  });

  it('allows re-parenting to an unrelated department', async () => {
    const rows = [...tree(), { id: 'D', parentDepartmentId: null, name: 'D', code: 'D' }];
    const { service, deptRepo } = build(rows);
    await service.update('C', { parentDepartmentId: 'D' });
    expect(deptRepo.save).toHaveBeenCalledTimes(1);
  });

  it('allows clearing the parent', async () => {
    const { service, deptRepo } = build(tree());
    await service.update('C', { parentDepartmentId: undefined });
    expect(deptRepo.save).toHaveBeenCalledTimes(1);
  });

  it('terminates on a cycle that already exists in the data', async () => {
    const rows: Row[] = [
      { id: 'X', parentDepartmentId: 'Y', name: 'X', code: 'X' },
      { id: 'Y', parentDepartmentId: 'X', name: 'Y', code: 'Y' },
      { id: 'Z', parentDepartmentId: null, name: 'Z', code: 'Z' },
    ];
    const { service } = build(rows);
    // Z -> X walks X -> Y -> X -> ... and must stop at the depth bound instead of looping.
    await expect(service.update('Z', { parentDepartmentId: 'X' })).resolves.toBeDefined();
  });
});
