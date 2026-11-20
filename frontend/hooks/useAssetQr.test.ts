import { renderHook, waitFor } from '@testing-library/react';
import { useAssetQr } from './useAssetQr';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({ api: { get: jest.fn() } }));

describe('useAssetQr', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let counter = 0;

  beforeEach(() => {
    counter = 0;
    (api.get as jest.Mock).mockResolvedValue({ data: new Blob(['x']) });
    URL.createObjectURL = jest.fn(() => `blob:mock-${++counter}`);
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    // Keep harmless no-ops while RTL auto-cleanup unmounts after this hook.
    URL.createObjectURL = originalCreate ?? jest.fn();
    URL.revokeObjectURL = originalRevoke ?? jest.fn();
    jest.clearAllMocks();
  });

  it('revokes the object URL on unmount', async () => {
    const { result, unmount } = renderHook(() => useAssetQr('a1'));
    await waitFor(() => expect(result.current.qrUrl).toBe('blob:mock-1'));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
  });

  it('revokes the previous URL when assetId changes', async () => {
    const { result, rerender } = renderHook(({ id }) => useAssetQr(id), {
      initialProps: { id: 'a1' },
    });
    await waitFor(() => expect(result.current.qrUrl).toBe('blob:mock-1'));
    rerender({ id: 'a2' });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
    await waitFor(() => expect(result.current.qrUrl).toBe('blob:mock-2'));
  });
});
