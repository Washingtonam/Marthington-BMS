import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CustomerDetail from '../pages/CustomerDetail.jsx';
import { getCustomer } from '../api/customers.js';

vi.mock('../api/customers.js', () => ({
  getCustomer: vi.fn()
}));

describe('CustomerDetail page', () => {
  it('shows quote dates and service progress in the customer history', async () => {
    getCustomer.mockResolvedValue({
      customer: { _id: 'cust-1', name: 'Ava Stone', createdAt: '2026-08-01T00:00:00.000Z' },
      sales: [],
      invoices: [
        {
          _id: 'quote-1',
          invoiceNumber: 'QT-100',
          invoiceType: 'quotation',
          status: 'sent',
          totalAmount: 15000,
          createdAt: '2026-09-01T00:00:00.000Z'
        },
        {
          _id: 'invoice-1',
          invoiceNumber: 'INV-100',
          invoiceType: 'invoice',
          paymentStatus: 'Paid',
          createdAt: '2026-09-02T00:00:00.000Z',
          items: [{ service: 'service-1', name: 'Equipment repair', serviceStatus: 'completed' }]
        }
      ]
    });

    render(
      <MemoryRouter initialEntries={['/app/customers/cust-1']}>
        <Routes>
          <Route path="/app/customers/:id" element={<CustomerDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('QT-100')).toBeTruthy();
    expect(screen.getAllByText('INV-100').length).toBeGreaterThan(0);
    expect(screen.getByText('Equipment repair')).toBeTruthy();
    expect(screen.getByText('completed')).toBeTruthy();
  });
});
