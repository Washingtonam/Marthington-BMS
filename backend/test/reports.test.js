import test from 'node:test';
import assert from 'node:assert/strict';

import reportsController from '../src/modules/reports/reports.controller.js';
import Sale from '../src/modules/sales/sale.model.js';
import Product from '../src/modules/products/product.model.js';
import Transaction from '../src/modules/transactions/transaction.model.js';
import { buildReportSnapshot, buildDailyAnalysisSnapshot } from '../src/modules/reports/reports.controller.js';
import { formatReportPeriodLabel, getCompletedReportRange, getLocalDate } from '../src/modules/admin/reportSnapshot.js';
import { isSubscriptionDue, shouldCreateAutomaticReportSubscription } from '../src/jobs/reportEmail.job.js';
import { sendReportEmail } from '../src/utils/emailService.js';
import axios from 'axios';

test('Scheduled report dates follow the subscription timezone', () => {
  const instant = new Date('2026-09-18T23:30:00.000Z');

  assert.equal(getLocalDate(instant, 'UTC'), '2026-09-18');
  assert.equal(getLocalDate(instant, 'Africa/Lagos'), '2026-09-19');
});

test('Automatic report schedules are limited to active Pro businesses with notifications enabled', () => {
  const business = {
    status: 'active',
    subscription: { plan: 'pro', status: 'active' },
    reportNotificationsEnabled: true,
    owner: { _id: 'owner-1', email: 'owner@example.com' }
  };

  assert.equal(shouldCreateAutomaticReportSubscription(business, false), true);
  assert.equal(shouldCreateAutomaticReportSubscription(business, true), false);
  assert.equal(shouldCreateAutomaticReportSubscription({ ...business, reportNotificationsEnabled: false }, false), false);
  assert.equal(shouldCreateAutomaticReportSubscription({ ...business, subscription: { plan: 'free', status: 'trial' } }, false), false);
});

test('Report schedules honor configured weekly and monthly days', () => {
  const monday = new Date('2026-09-21T18:00:00.000Z');
  const tuesday = new Date('2026-09-22T18:00:00.000Z');
  const fifteenth = new Date('2026-09-15T18:00:00.000Z');
  const firstOfMonth = new Date('2026-09-01T18:00:00.000Z');
  const monthEnd = new Date('2026-09-30T18:00:00.000Z');

  assert.equal(isSubscriptionDue({ frequency: 'weekly', sendTime: '18:00', timezone: 'UTC', weeklyDay: 1 }, monday), true);
  assert.equal(isSubscriptionDue({ frequency: 'weekly', sendTime: '18:00', timezone: 'UTC', weeklyDay: 1 }, tuesday), false);
  assert.equal(isSubscriptionDue({ frequency: 'monthly', sendTime: '18:00', timezone: 'UTC', monthlyDay: 15 }, fifteenth), true);
  assert.equal(isSubscriptionDue({ frequency: 'monthly', sendTime: '18:00', timezone: 'UTC', monthlyDay: 15 }, monthEnd), false);
  assert.equal(isSubscriptionDue({ frequency: 'monthly', sendTime: '18:00', timezone: 'UTC', monthlyDay: 'first' }, firstOfMonth), true);
  assert.equal(isSubscriptionDue({ frequency: 'monthly', sendTime: '18:00', timezone: 'UTC', monthlyDay: 'last' }, monthEnd), true);
});

test('Report schedules catch up later on the same scheduled day', () => {
  assert.equal(isSubscriptionDue({ frequency: 'daily', sendTime: '18:00', timezone: 'UTC' }, new Date('2026-09-22T20:00:00.000Z')), true);
  assert.equal(isSubscriptionDue({ frequency: 'daily', sendTime: '18:00', timezone: 'UTC' }, new Date('2026-09-22T17:59:00.000Z')), false);
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

test('Reports include unpaid invoice summaries in the snapshot', () => {
  const snapshot = buildReportSnapshot({
    sales: [],
    products: [],
    transactions: [],
    invoices: [{
      _id: 'inv-1',
      invoiceNumber: 'INV-1001',
      customerName: 'Jane Doe',
      totalAmount: 500,
      amountPaid: 250,
      balanceDue: 250,
      paymentStatus: 'Partially Paid',
      status: 'partial',
      dueDate: new Date('2026-09-30T00:00:00.000Z'),
      createdAt: new Date('2026-09-15T00:00:00.000Z')
    }]
  });

  assert.equal(snapshot.unpaidInvoices.length, 1);
  assert.equal(snapshot.unpaidInvoices[0].customerName, 'Jane Doe');
  assert.equal(snapshot.unpaidInvoices[0].balanceDue, 250);
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

test('Reports: scheduled email uses a summary view with a branded CTA', async () => {
  const originalAxiosPost = axios.post;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM;

  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM = 'hello@marthington.com';
  axios.post = async (url, payload) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(payload.from, 'Marthington BMS <hello@marthington.com>');
    assert.match(payload.html, /Sales for today/i);
    assert.match(payload.html, /View more details/i);
    assert.match(payload.html, /https:\/\/cdn.example.com\/bright-mart.png/);
    assert.match(payload.html, /support@brightmart.example/);
    assert.match(payload.html, /confidential business information/i);
    assert.doesNotMatch(payload.html, /Rice|Beans|Detailed breakdown/i);
    return { data: { id: 'email-1' } };
  };

  try {
    const sent = await sendReportEmail({
      recipientEmail: 'owner@example.com',
      recipientName: 'Ada',
      businessName: 'Bright Mart',
      businessProfile: {
        name: 'Bright Mart',
        address: '12 Market Street',
        phone: '+2348000000000',
        email: 'hello@brightmart.example',
        supportEmail: 'support@brightmart.example',
        logo: 'https://cdn.example.com/bright-mart.png'
      },
      reportType: 'daily-analysis',
      frequency: 'daily',
      periodLabel: 'Daily report for Sep 18, 2026',
      snapshot: {
        overview: { revenue: 250000, expenses: 75000, netProfit: 175000, salesCount: 42 },
        sales: [],
        paymentMethods: [{ method: 'Cash', count: 12, amount: 90000 }],
        expensesByCategory: { Utilities: 20000 },
      },
      unsubscribeUrl: 'https://example.com/unsubscribe'
    });

    assert.equal(sent, true);
  } finally {
    axios.post = originalAxiosPost;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalApiKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM; else process.env.RESEND_FROM = originalFrom;
  }
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
