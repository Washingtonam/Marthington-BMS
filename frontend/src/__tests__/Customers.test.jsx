import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Customers from '../pages/Customers.jsx';
import { deleteCustomer, getCustomers, updateCustomer } from '../api/customers.js';
import { getStaff } from '../api/staff.js';

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'owner' } }),
}));

vi.mock('../api/customers.js', () => ({
  deleteCustomer: vi.fn(async () => ({ message: 'Customer deleted successfully' })),
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

vi.mock('../api/staff.js', () => ({
  getStaff: vi.fn()
}));

afterEach(cleanup);

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

  it('paginates customers and resets to the first page when searching', async () => {
    getCustomers.mockResolvedValueOnce(Array.from({ length: 12 }, (_, index) => ({
      _id: `cust-${index + 1}`,
      name: `Customer ${index + 1}`,
      isActive: true
    })));
    render(<MemoryRouter><Customers /></MemoryRouter>);

    expect(await screen.findByText('Showing 1–10 of 12 customers')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(screen.getByText('Showing 11–12 of 12 customers')).toBeTruthy();
    expect(screen.getAllByText('Customer 12').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText('Search by name, phone, or email'), {
      target: { value: 'Customer 1' }
    });
    await waitFor(() => expect(screen.getByText('Showing 1–4 of 4 customers')).toBeTruthy());
    expect(screen.getAllByText('Customer 1').length).toBeGreaterThan(0);
  });

  it('requires confirmation before deleting a customer', async () => {
    render(<MemoryRouter><Customers /></MemoryRouter>);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Delete Ava Stone' }))[0]);
    expect(screen.getByRole('dialog', { name: 'Delete customer?' })).toBeTruthy();
    expect(deleteCustomer).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete customer' }));
    await waitFor(() => expect(deleteCustomer).toHaveBeenCalledWith('cust-1'));
  });

  it('opens a drafted WhatsApp message for a selected customer', async () => {
    getCustomers.mockResolvedValueOnce([{
      _id: 'cust-2',
      name: 'Jordan Lee',
      phone: '08031234567',
      whatsappFollowUpConsent: true
    }]);
    const openWhatsApp = vi.spyOn(window, 'open').mockReturnValue({ opener: window });
    render(<MemoryRouter><Customers /></MemoryRouter>);

    expect((await screen.findAllByText('Jordan Lee')).length).toBeGreaterThan(0);
    fireEvent.click((await screen.findAllByRole('button', { name: /draft whatsapp/i }))[0]);
    expect(screen.getByRole('heading', { name: 'Draft WhatsApp message' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hello Jordan, our new products are now in stock.' }
    });
    fireEvent.click(screen.getByRole('button', { name: /open whatsapp/i }));

    expect(openWhatsApp).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/2348031234567'),
      '_blank'
    );
    openWhatsApp.mockRestore();
  });

  it('allows an authorized owner to draft a WhatsApp message to staff', async () => {
    getStaff.mockResolvedValueOnce([{
      _id: 'staff-1',
      name: 'Sam Taylor',
      phone: '08039876543'
    }]);
    const openWhatsApp = vi.spyOn(window, 'open').mockReturnValue({ opener: window });
    render(<MemoryRouter><Customers /></MemoryRouter>);

    fireEvent.click((await screen.findAllByRole('button', { name: /draft whatsapp/i }))[0]);
    fireEvent.change(screen.getByLabelText('Recipient type'), { target: { value: 'staff' } });
    expect(await screen.findByRole('option', { name: /Sam Taylor/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /open whatsapp/i }));

    expect(openWhatsApp).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/2348039876543'),
      '_blank'
    );
    openWhatsApp.mockRestore();
  });
});
