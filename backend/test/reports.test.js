import test from 'node:test';
import assert from 'node:assert/strict';

import reportsController from '../src/modules/reports/reports.controller.js';
import Sale from '../src/modules/sales/sale.model.js';
import Product from '../src/modules/products/product.model.js';
import Transaction from '../src/modules/transactions/transaction.model.js';
import { buildReportSnapshot, buildDailyAnalysisSnapshot } from '../src/modules/reports/reports.controller.js';
import { formatReportPeriodLabel, getCompletedReportRange, getLocalDate } from '../src/modules/admin/reportSnapshot.js';

test('Scheduled report dates follow the subscription timezone', () => {
  const instant = new Date('2026-09-18T23:30:00.000Z');

  assert.equal(getLocalDate(instant, 'UTC'), '2026-09-18');
  assert.equal(getLocalDate(instant, 'Africa/Lagos'), '2026-09-19');
});

test('Completed report ranges exclude the current local day', () => {
  const now = new Date('2026-09-18T23:30:00.000Z');
  const daily = getCompletedReportRange(now, 'Africa/Lagos', 'daily');
  const weekly = getCompletedReportRange(now, 'Africa/Lagos', 'weekly');

  assert.equal(daily.startLocalDate, '2026-09-18');
  assert.equal(daily.endLocalDate, '2026-09-18');
  assert.equal(weekly.startLocalDate, '2026-09-12');
  assert.equal(weekly.endLocalDate, '2026-09-18');
});

test('Completed monthly range selects the previous calendar month', () => {
  const range = getCompletedReportRange(new Date('2026-09-01T08:00:00.000Z'), 'Africa/Lagos', 'monthly');

  assert.equal(range.startLocalDate, '2026-08-01');
  assert.equal(range.endLocalDate, '2026-08-31');
  assert.equal(formatReportPeriodLabel(range, 'monthly'), 'Monthly report: Aug 1, 2026 - Aug 31, 2026');
});

test('Reports: 30-day snapshot filters sales and costs to the selected period', () => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const sales = [
    {
      _id: 'sale-1',
      totalAmount: 200,
      totalProfit: 50,
      createdAt: new Date(now - 5 * dayMs),
      createdBy: { _id: 'staff-1', name: 'Alice' },
      isDeleted: false,
    },
    {
      _id: 'sale-2',
      totalAmount: 300,
      totalProfit: 80,
      createdAt: new Date(now - 10 * dayMs),
      createdBy: { _id: 'staff-1', name: 'Alice' },
      isDeleted: false,
    },
    {
      _id: 'sale-3',
      totalAmount: 500,
      totalProfit: 100,
      createdAt: new Date(now - 70 * dayMs),
      createdBy: { _id: 'staff-2', name: 'Bob' },
      isDeleted: false,
    }
  ];

  const products = [
    { _id: 'p-1', name: 'Milk', price: 30, stock: 5 },
    { _id: 'p-2', name: 'Rice', price: 50, stock: 2 }
  ];

  const transactions = [
    {
      _id: 'tx-1',
      amount: 40,
      status: 'posted',
      transactionType: 'expense',
      occurredAt: new Date(now - 6 * dayMs),
      isDeleted: false,
    },
    {
      _id: 'tx-2',
      amount: 100,
      status: 'posted',
      transactionType: 'expense',
      occurredAt: new Date(now - 120 * dayMs),
      isDeleted: false,
    }
  ];

  const snapshot = buildReportSnapshot({ sales, products, transactions, period: '30' });

  assert.equal(snapshot.overview.periodRevenue, 500);
  assert.equal(snapshot.overview.periodGrossProfit, 130);
  assert.equal(snapshot.overview.periodOperatingExpenses, 40);
  assert.equal(snapshot.overview.periodProfit, 90);
  assert.equal(snapshot.recentSales.length, 2);
  assert.equal(snapshot.lowStockProducts.length, 2);
});

test('Reports: branch inventory uses branch quantities and prices', () => {
  const snapshot = buildReportSnapshot({
    products: [],
    inventory: [
      { quantity: 4, branchPrice: 25, product: { _id: 'p-1', name: 'Milk', price: 30 } },
      { quantity: 20, branchPrice: 50, product: { _id: 'p-2', name: 'Rice', price: 60 } }
    ],
    period: '30'
  });

  assert.equal(snapshot.overview.inventoryValue, 1100);
  assert.equal(snapshot.lowStockProducts.length, 1);
  assert.equal(snapshot.lowStockProducts[0].stock, 4);
});

test('Reports: fallback profit is computed from sale items when the virtual is missing', () => {
  const snapshot = buildReportSnapshot({
    sales: [
      {
        totalAmount: 500,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        items: [
          { sellingPrice: 250, costPrice: 150, quantity: 1 },
          { sellingPrice: 300, costPrice: 180, quantity: 1 }
        ]
      },
      {
        totalAmount: 300,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        items: [
          { sellingPrice: 150, costPrice: 120, quantity: 1 }
        ]
      }
    ],
    transactions: [{ amount: 40, status: 'posted', transactionType: 'expense', occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), isDeleted: false }],
    period: '30'
  });

  assert.equal(snapshot.overview.periodGrossProfit, 250);
  assert.equal(snapshot.overview.periodProfit, 210);
});

test('Reports: daily analysis separates payment methods and subtracts expenses', () => {
  const date = '2026-08-25';
  const snapshot = buildDailyAnalysisSnapshot({
    date,
    sales: [
      { totalAmount: 500, paymentMethod: 'cash', createdAt: `${date}T10:00:00.000Z`, items: [{ costPrice: 200, quantity: 1 }] },
      { totalAmount: 300, paymentMethod: 'bank_transfer', createdAt: `${date}T12:00:00.000Z`, items: [{ costPrice: 100, quantity: 1 }] },
      { totalAmount: 900, paymentMethod: 'cash', createdAt: '2026-08-24T12:00:00.000Z', items: [] },
    ],
    transactions: [{ amount: 150, category: 'transport', occurredAt: `${date}T15:00:00.000Z` }],
  });

  assert.deepEqual(snapshot.summary, { salesCount: 2, revenue: 800, cogs: 300, grossProfit: 500, expenses: 150, netProfit: 350 });
  assert.deepEqual(snapshot.paymentMethods, [
    { method: 'cash', count: 1, amount: 500 },
    { method: 'bank_transfer', count: 1, amount: 300 },
  ]);
});

test('Reports: sales query includes the sale status in the projection', async () => {
  const originalSaleFind = Sale.find;
  const originalProductFind = Product.find;
  const originalTransactionFind = Transaction.find;

  const sale = {
    _id: 'sale-123',
    totalAmount: 300,
    createdAt: new Date(),
    status: 'posted',
    items: [],
    paymentMethod: 'cash',
    createdBy: { _id: 'staff-1', name: 'Alice' },
  };

  try {
    Sale.find = () => ({
      select: (projection) => {
        assert.match(projection, /status/);
        return {
          populate: () => ({
            sort: () => [sale],
          }),
        };
      },
    });

    Product.find = () => [];
    Transaction.find = () => ({ lean: () => [] });

    const req = {
      user: { businessId: 'biz-1', role: 'owner' },
      query: {},
    };

    const res = {
      json: (payload) => {
        assert.ok(Array.isArray(payload.sales));
        assert.equal(payload.sales[0].status, 'posted');
      },
      status: () => res,
    };

    await reportsController.getReports(req, res);
  } finally {
    Sale.find = originalSaleFind;
    Product.find = originalProductFind;
    Transaction.find = originalTransactionFind;
  }
});
