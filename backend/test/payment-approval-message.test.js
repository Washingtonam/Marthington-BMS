import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPaymentApprovalMessage } from '../src/modules/sales/sales.utils.js';

test('buildPaymentApprovalMessage includes receipt details for a confirmed order', () => {
  const message = buildPaymentApprovalMessage({
    businessName: 'Northwind Store',
    sale: { receiptId: 'WA-100', totalAmount: 12500 },
    receiptUrl: 'https://example.com/#/r/WA-100'
  });

  assert.match(message, /Payment confirmed by Northwind Store/);
  assert.match(message, /Order reference: WA-100/);
  assert.match(message, /₦12,500/);
  assert.match(message, /https:\/\/example\.com\/#\/r\/WA-100/);
});