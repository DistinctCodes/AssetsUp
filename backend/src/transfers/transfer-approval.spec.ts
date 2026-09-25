import {
  TRANSFER_STATUSES,
  allowedTransitions,
  assertCanApprove,
  assertTransition,
  canTransition,
  evaluateApproval,
  isPending,
} from './transfer-approval';

describe('transfer workflow', () => {
  it('starts every transfer pending', () => {
    expect(isPending('PENDING')).toBe(true);
    expect(allowedTransitions('PENDING')).toEqual(['APPROVED', 'REJECTED', 'CANCELLED']);
    expect(TRANSFER_STATUSES[0]).toBe('PENDING');
  });

  it('requires approval before completion', () => {
    expect(canTransition('PENDING', 'COMPLETED')).toBe(false);
    expect(canTransition('APPROVED', 'COMPLETED')).toBe(true);
  });

  it('treats rejected, completed and cancelled as final', () => {
    for (const status of ['REJECTED', 'COMPLETED', 'CANCELLED']) {
      expect(allowedTransitions(status)).toEqual([]);
      expect(canTransition(status, 'APPROVED')).toBe(false);
    }
  });

  it('never applies the same step twice', () => {
    expect(() => assertTransition('APPROVED', 'APPROVED')).toThrow(/already APPROVED/i);
    expect(() => assertTransition('COMPLETED', 'COMPLETED')).toThrow(/already COMPLETED/i);
  });

  it('reports a clear reason for an illegal step', () => {
    expect(() => assertTransition('REJECTED', 'COMPLETED')).toThrow(/Transfer is REJECTED and is final/);
    expect(() => assertTransition('PENDING', 'COMPLETED')).toThrow(
      /Allowed: APPROVED, REJECTED, CANCELLED/,
    );
  });
});

describe('evaluateApproval', () => {
  it('allows a different user to approve a pending transfer', () => {
    const decision = evaluateApproval({
      status: 'PENDING',
      requestedByUserId: 'user-a',
      approverUserId: 'user-b',
    });
    expect(decision).toEqual({ allowed: true, reason: null });
  });

  it('blocks self approval', () => {
    const decision = evaluateApproval({
      status: 'PENDING',
      requestedByUserId: 'user-a',
      approverUserId: 'user-a',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('cannot be approved by the requesting user');
  });

  it('requires an approver', () => {
    const decision = evaluateApproval({
      status: 'PENDING',
      requestedByUserId: 'user-a',
      approverUserId: '',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('An approver is required');
  });

  it('refuses to approve a transfer that is no longer pending', () => {
    const decision = evaluateApproval({
      status: 'COMPLETED',
      requestedByUserId: 'user-a',
      approverUserId: 'user-b',
    });
    expect(decision.allowed).toBe(false);
  });

  it('throws from the assert variant', () => {
    expect(() =>
      assertCanApprove({
        status: 'PENDING',
        requestedByUserId: 'user-a',
        approverUserId: 'user-a',
      }),
    ).toThrow(/requesting user/);
  });
});
