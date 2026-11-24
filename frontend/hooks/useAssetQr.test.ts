import { renderHook, waitFor } from '@testing-library/react';
import { useAssetQr } from './useAssetQr';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
}));

const mockedGet = api.get as jest.Mock;

describe('useAssetQr', () => {
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    createObjectURL = jest.fn(() => 'blob:qr');
    revokeObjectURL = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });
    mockedGet.mockResolvedValue({ data: new Blob(['qr']) });
  });

  it('publishes the object URL for the requested asset', async () => {
    const { result } = renderHook(() => useAssetQr('asset-1'));

    await waitFor(() => expect(result.current.qrUrl).toBe('blob:qr'));
    expect(mockedGet).toHaveBeenCalledWith('/assets/asset-1/qr', {
      responseType: 'blob',
    });
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it('revokes the object URL on unmount', async () => {
    const { unmount } = renderHook(() => useAssetQr('asset-1'));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    expect(revokeObjectURL).not.toHaveBeenCalled();

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:qr');
  });

  it('revokes the previous object URL when assetId changes', async () => {
    createObjectURL
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');
    const { result, rerender } = renderHook(
      ({ id }) => useAssetQr(id),
      { initialProps: { id: 'asset-1' } },
    );

    await waitFor(() => expect(result.current.qrUrl).toBe('blob:first'));

    rerender({ id: 'asset-2' });

    // The old URL is released before the new request replaces it, and is not
    // left rendered in the meantime.
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first');
    expect(result.current.qrUrl).toBeNull();

    await waitFor(() => expect(result.current.qrUrl).toBe('blob:second'));
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('never creates a URL for a request that resolves after unmount', async () => {
    let resolveRequest!: (value: unknown) => void;
    mockedGet.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { unmount } = renderHook(() => useAssetQr('asset-1'));
    unmount();

    resolveRequest({ data: new Blob(['qr']) });
    await Promise.resolve();

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});
