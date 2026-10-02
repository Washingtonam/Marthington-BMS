import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/offlineDb.js', () => ({
  db: { products: { clear: vi.fn(), bulkPut: vi.fn() }, pendingOperations: { clear: vi.fn(), add: vi.fn(), toArray: vi.fn() }, pendingSales: { clear: vi.fn() }, offlineSnapshot: { clear: vi.fn(), bulkPut: vi.fn(), get: vi.fn() }, cachedCollections: { get: vi.fn(), put: vi.fn(), bulkPut: vi.fn() } },
  cacheCollection: vi.fn(),
  getCachedCollection: vi.fn(),
  getActiveBusinessId: vi.fn(() => null),
  getOfflineSnapshotCollection: vi.fn(),
  queueOperation: vi.fn(async ({ path }) => `queued-${path}`),
  clearQueuedOperations: vi.fn(async () => undefined)
}));

describe('offline mutation policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        clear: vi.fn()
      },
      configurable: true
    });

    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: true,
      configurable: true
    });

    global.fetch = vi.fn();
  });

  it('queues non-sale mutations when the network fails, but not POS sale writes', async () => {
    const { default: request } = await import('../api/client.js');
    const offlineDb = await import('../api/offlineDb.js');

    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(request('/products', { method: 'POST', body: JSON.stringify({ name: 'Tea' }) })).resolves.toMatchObject({
      offline: true,
      pending: true,
      success: true,
    });

    expect(offlineDb.queueOperation).toHaveBeenCalledTimes(1);
    expect(offlineDb.queueOperation).toHaveBeenCalledWith(expect.objectContaining({ path: '/products' }));

    vi.clearAllMocks();
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(request('/sales', { method: 'POST', body: JSON.stringify({ items: [] }) })).rejects.toThrow();

    expect(offlineDb.queueOperation).not.toHaveBeenCalled();
  });

  it('uses only the active business cache for offline product reads', async () => {
    const { default: request } = await import('../api/client.js');
    const offlineDb = await import('../api/offlineDb.js');

    global.localStorage.getItem = vi.fn((key) => ({
      bms_user: JSON.stringify({ business: 'business-b' }),
      bms_token: 'staff-token'
    }[key] || null));
    offlineDb.getActiveBusinessId.mockReturnValue('business-b');
    offlineDb.getCachedCollection.mockImplementation(async (key) => (
      key === 'business-b:/products?limit=500' ? { products: [{ _id: 'b-product' }] } : null
    ));
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(request('/products?limit=500')).resolves.toEqual({
      products: [{ _id: 'b-product' }]
    });

    expect(offlineDb.getCachedCollection).toHaveBeenCalledWith('business-b:/products?limit=500');
    expect(offlineDb.getCachedCollection).not.toHaveBeenCalledWith('business-a:/products?limit=500');
  });
});
