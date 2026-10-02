import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSalesQuery } from '../src/modules/sales/sales.utils.js';

test('buildSalesQuery supports payment status filtering for approval queues', () => {
  assert.deepEqual(buildSalesQuery({ businessId: 'biz-1', paymentStatus: 'pending' }), {
    business: 'biz-1',
    isDeleted: { $ne: true },
    paymentStatus: 'pending'
  });

  assert.deepEqual(buildSalesQuery({ businessId: 'biz-1', paymentStatus: 'verified', status: 'posted' }), {
    business: 'biz-1',
    isDeleted: { $ne: true },
    paymentStatus: 'verified',
    status: 'posted'
  });
});