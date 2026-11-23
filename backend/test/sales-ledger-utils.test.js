import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSalesDateFilter,
  buildProductCompensationEntries,
  buildSaleLedgerEntry,
  normalizePaymentBreakdown
} from '../src/modules/sales/sales.utils.js';

test('sales date filter includes the complete selected UTC day', () => {
  const filter = buildSalesDateFilter({ startDate: '2026-10-09', endDate: '2026-10-09' });

  assert.deepEqual(filter, {
    createdAt: {
      $gte: new Date('2026-10-09T00:00:00.000Z'),
      $lt: new Date('2026-10-10T00:00:00.000Z')
    }
  });
});

test('sales date filter respects the browser timezone offset', () => {
  const filter = buildSalesDateFilter({
    startDate: '2026-10-10',
    endDate: '2026-10-10',
    timezoneOffset: -60
  });

  assert.deepEqual(filter, {
    createdAt: {
      $gte: new Date('2026-10-09T23:00:00.000Z'),
      $lt: new Date('2026-10-10T23:00:00.000Z')
    }
  });
});

test('sales date filter rejects invalid and reversed date ranges', () => {
  assert.equal(buildSalesDateFilter({ startDate: '2026-02-30' }).error, 'Dates must use the YYYY-MM-DD format and be valid calendar dates.');
  assert.equal(buildSalesDateFilter({ startDate: '2026-10-10', endDate: '2026-10-09' }).error, 'Start date must be on or before end date.');
  assert.equal(buildSalesDateFilter({ startDate: '2026-10-10', timezoneOffset: 841 }).error, 'Timezone offset must be a whole number of minutes within 14 hours of UTC.');
});

test('sale compensation entries keep original unit cost and return type', () => {
  const entries = buildProductCompensationEntries({
    _id: 'sale-1',
    items: [
      { itemType: 'product', product: 'prod-1', quantity: 2, costPrice: 125, name: 'Widget' },
      { itemType: 'service', name: 'Setup', quantity: 1, costPrice: 0 }
    ]
  }, {
    businessId: 'biz-1',
    createdBy: 'user-1'
  });

  assert.deepEqual(entries, [{
    business: 'biz-1',
    product: 'prod-1',
    type: 'return',
    quantity: 2,
    unitCost: 125,
    note: 'Sale reversal sale-1',
    createdBy: 'user-1'
  }]);
});

test('sale ledger reversal entry keeps the original sale amount and source metadata', () => {
  const entry = buildSaleLedgerEntry({
    sale: {
      _id: 'sale-2',
      totalAmount: 2500,
      receiptId: 'RCPT-123',
      items: [{ quantity: 2, costPrice: 100, sellingPrice: 500, total: 1000 }]
    },
    businessId: 'biz-2',
    createdBy: 'user-2',
    status: 'reversed'
  });

  assert.equal(entry.transactionType, 'income');
  assert.equal(entry.postingType, 'credit');
  assert.equal(entry.status, 'reversed');
  assert.equal(entry.amount, 2500);
  assert.equal(entry.sourceModel, 'Sale');
  assert.equal(entry.sourceId, 'sale-2');
});

test('split payment breakdown validates exact totals and preserves tender references', () => {
  const result = normalizePaymentBreakdown([
    { method: 'cash', amount: 1250, reference: '' },
    { method: 'bank_transfer', amount: 750.5, reference: 'TRX-123' }
  ], 2000.5);

  assert.deepEqual(result, {
    payments: [
      { method: 'cash', amount: 1250, reference: '' },
      { method: 'bank_transfer', amount: 750.5, reference: 'TRX-123' }
    ]
  });
});

test('split payment breakdown rejects underpayment, overpayment, credit, and invalid amounts', () => {
  const twoPayments = [
    { method: 'cash', amount: 50 },
    { method: 'card', amount: 40 }
  ];

  assert.match(normalizePaymentBreakdown(twoPayments, 100).error, /do not cover/);
  assert.match(normalizePaymentBreakdown([{ ...twoPayments[0], amount: 61 }, twoPayments[1]], 100).error, /exceed/);
  assert.match(normalizePaymentBreakdown([
    { method: 'cash', amount: 50 },
    { method: 'credit', amount: 50 }
  ], 100).error, /only use/);
  assert.match(normalizePaymentBreakdown([
    { method: 'cash', amount: 50 },
    { method: 'card', amount: 50.001 }
  ], 100).error, /two decimal places/);
});

test('sale ledger carries split tender details without duplicating sale revenue', () => {
  const entry = buildSaleLedgerEntry({
    sale: {
      _id: 'sale-split',
      totalAmount: 100,
      paymentMethod: 'split',
      paymentBreakdown: [
        { method: 'cash', amount: 40 },
        { method: 'bank_transfer', amount: 60 }
      ],
      items: [{ quantity: 1, costPrice: 40, sellingPrice: 100 }]
    },
    businessId: 'biz-1'
  });

  assert.equal(entry.amount, 100);
  assert.equal(entry.profit, 60);
  assert.equal(entry.paymentMethod, 'split');
  assert.deepEqual(entry.paymentBreakdown, [
    { method: 'cash', amount: 40 },
    { method: 'bank_transfer', amount: 60 }
  ]);
});
