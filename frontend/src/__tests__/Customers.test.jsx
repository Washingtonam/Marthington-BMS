import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Customers from '../pages/Customers.jsx';
import { updateCustomer } from '../api/customers.js';

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'owner' } }),
}));

vi.mock('../api/customers.js', () => ({
  updateCustomer: vi.fn(async (id, payload) => ({ _id: id, ...payload })),
  getCustomers: vi.fn(async () => [
    {
      _id: 'cust-1',
      name: 'Ava Stone',
      phone: '',
      email: '',
      address: '123 Main St',
      totalSpent: 120000,
      totalOrders: 2,
      status: 'active',
      outstandingBalance: 25000,
      createdAt: '2026-08-01T00:00:00.000Z',
    },
  ]),
}));

describe('Customers page', () => {
  it('opens the add customer drawer', async () => {
    render(<MemoryRouter><Customers /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /add customer/i }));

    expect(await screen.findByText('New Customer')).toBeTruthy();
  });

  it('saves edited customer contact information', async () => {
    render(<MemoryRouter><Customers /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'View' }));
    fireEvent.click(screen.getByRole('button', { name: /edit customer/i }));
    const phoneInputs = screen.getAllByLabelText('Phone');
    fireEvent.change(phoneInputs[phoneInputs.length - 1], { target: { value: '08031234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateCustomer).toHaveBeenCalledWith('cust-1', expect.objectContaining({
      phone: '08031234567'
    })));
  });

  it('marks contactless customers for attention and filters them', async () => {
    render(<MemoryRouter><Customers /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Attention required (1)' }));

    expect(screen.getAllByText('Attention required').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ava Stone').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add contact details' })[0]);
    expect(screen.getByRole('heading', { name: 'Edit customer' })).toBeTruthy();
  });
});
