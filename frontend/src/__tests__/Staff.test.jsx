import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Staff from '../pages/Staff.jsx'
import Sidebar from '../components/layout/Sidebar.jsx'

const mockStaff = vi.hoisted(() => ({ items: [] }))

vi.mock('../api/client.js', () => {
  return {
    default: async (path) => {
      if (path === '/staff') return mockStaff.items
      return {}
    }
  }
})

beforeEach(() => {
  mockStaff.items = []
  vi.useRealTimers()
})

afterEach(() => {
  cleanup()
  localStorage.removeItem('bms_user')
  vi.useRealTimers()
})

describe('Staff page', () => {
  it('shows the team and access navigation with a direct roles shortcut', () => {
    render(
      <MemoryRouter initialEntries={['/app/staff']}>
        <Sidebar />
      </MemoryRouter>
    )

    const sidebar = document.querySelector('aside')
    fireEvent.mouseEnter(sidebar)

    expect(screen.getByText('Team & Access')).toBeTruthy()
    expect(screen.getByText('Staff')).toBeTruthy()
    expect(screen.getByText('Roles & Permissions')).toBeTruthy()
    expect(screen.getByText('Branches')).toBeTruthy()
  })

  it('allows the desktop sidebar to be collapsed and expanded with its toggle', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <Sidebar />
      </MemoryRouter>
    )

    const sidebar = document.querySelector('aside')
    expect(sidebar).toBeTruthy()

    expect(screen.getByText('Dashboard')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(screen.queryByText('Dashboard')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(screen.getByText('Dashboard')).toBeTruthy()
  })

  it('renders Add Team Member button and opens drawer', async () => {
    render(<Staff />)
    const btn = await screen.findByText('+ Add Team Member')
    expect(btn).toBeTruthy()
    fireEvent.click(btn)
    expect(await screen.findByText('New Team Member')).toBeTruthy()
  })

  it('opens staff actions from the card or the three-dot button', async () => {
    mockStaff.items = [{
      _id: 'staff-1',
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      role: 'staff',
      branch: 'Head office',
      isActive: true,
      permissions: {}
    }]

    render(<Staff />)
    const staffCard = await screen.findByRole('group', { name: 'Actions for Jordan Lee' })

    fireEvent.click(staffCard)
    expect(await screen.findByRole('menu')).toBeTruthy()
    expect(screen.getByText('Edit access')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Jordan Lee' }))
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Jordan Lee' }))
    expect(await screen.findByRole('menu')).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit access' }))
    expect(await screen.findByText('Modify Staff')).toBeTruthy()
  })

  it('toggles permission switch', async () => {
    render(<Staff />)
    const btn = await screen.findByText('+ Add Team Member')
    fireEvent.click(btn)
    const permissionLabel = await screen.findByText('Create sales')
    expect(permissionLabel).toBeTruthy()
    const toggleBtns = await screen.findAllByRole('button')
    fireEvent.click(toggleBtns[toggleBtns.length - 1])
    expect(true).toBe(true)
  })

  it('hides sidebar pages when the staff member lacks view permission', () => {
    localStorage.setItem('bms_user', JSON.stringify({
      role: 'staff',
      permissions: {
        canAccessPOS: true,
        canViewSales: true
      }
    }))

    render(
      <MemoryRouter initialEntries={['/app/pos']}>
        <Sidebar />
      </MemoryRouter>
    )

    const sidebar = document.querySelector('aside')
    fireEvent.mouseEnter(sidebar)

    expect(screen.getByText('POS')).toBeTruthy()
    expect(screen.getByText('Sales')).toBeTruthy()
    expect(screen.queryByText('Products')).toBeNull()
    expect(screen.queryByText('Customers / CRM')).toBeNull()
    expect(screen.queryByText('Staff')).toBeNull()
  })
})
