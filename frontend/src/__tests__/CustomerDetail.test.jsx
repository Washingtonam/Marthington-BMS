import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CustomerDetail from '../pages/CustomerDetail.jsx';
import { getCustomer, updateCustomer, deleteCustomer } from '../api/customers.js';

vi.mock('../api/customers.js', () => ({
  getCustomer: vi.fn(),
  updateCustomer: vi.fn(async (_id, payload) => ({ _id: 'cust-1', name: 'Ava Stone', ...payload })),
  deleteCustomer: vi.fn(async () => ({ message: 'Customer deleted successfully' }))
}));

vi.mock('../api/products.js', () => ({
  getProducts: vi.fn(async () => [
    { _id: 'product-1', name: 'Canon Printer', price: 125000 },
    { _id: 'product-2', name: 'ID Card Printer', price: 95000 }
  ])
}));

afterEach(cleanup);

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

  it('searches products, drafts a message, and toggles history accordions', async () => {
    getCustomer.mockResolvedValue({
      customer: { _id: 'cust-1', name: 'Ava Stone', phone: '08031234567', messageHistory: [] },
      sales: [],
      invoices: []
    });

    render(
      <MemoryRouter initialEntries={['/app/customers/cust-1']}>
        <Routes><Route path="/app/customers/:id" element={<CustomerDetail />} /></Routes>
      </MemoryRouter>
    );

    const search = await screen.findByLabelText('Search products');
    fireEvent.change(search, { target: { value: 'Canon' } });
    fireEvent.click(await screen.findByRole('button', { name: /Canon Printer/i }));
    expect((await screen.findByRole('textbox', { name: 'WhatsApp message' })).value).toContain('Canon Printer');

    fireEvent.click(screen.getByRole('button', { name: /Quotes/i }));
    expect(screen.queryByText(/No quotes recorded/i)).toBeNull();
    expect(await screen.findByText('No WhatsApp messages recorded yet.')).toBeTruthy();
  });

  it('drafts an invoice reminder with reference, item quantities, and balance', async () => {
    getCustomer.mockResolvedValue({
      customer: { _id: 'cust-1', name: 'Ava Stone', phone: '08031234567', messageHistory: [] },
      sales: [],
      invoices: [{
        _id: 'invoice-1',
        invoiceNumber: 'INV-2026-10-000276',
        invoiceType: 'invoice',
        totalAmount: 4500,
        amountPaid: 1500,
        balanceDue: 3000,
        paymentStatus: 'Partially Paid',
        items: [{ name: 'Paper', quantity: 3, price: 1500, total: 4500 }]
      }]
    });

    render(
      <MemoryRouter initialEntries={['/app/customers/cust-1']}>
        <Routes><Route path="/app/customers/:id" element={<CustomerDetail />} /></Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /draft whatsapp follow-up for inv-2026-10-000276/i }));
    const message = await screen.findByRole('textbox', { name: 'WhatsApp message' });
    expect(message.value).toContain('Invoice reference: INV-2026-10-000276');
    expect(message.value).toContain('Paper × 3');
    expect(message.value).toContain('Outstanding balance:');
  });
});
