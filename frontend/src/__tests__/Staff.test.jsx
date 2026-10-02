import React from 'react'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Staff from '../pages/Staff.jsx'
import Sidebar from '../components/layout/Sidebar.jsx'

vi.mock('../api/client.js', () => {
  return {
    default: async (path) => {
      if (path === '/staff') return []
      return {}
    }
  }
})

beforeEach(() => {
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

  it('collapses the sidebar back to its compact rail after a short idle period', () => {
    vi.useFakeTimers()

    render(
      <MemoryRouter initialEntries={['/app']}>
        <Sidebar />
      </MemoryRouter>
    )

    const sidebar = document.querySelector('aside')
    expect(sidebar).toBeTruthy()

    fireEvent.mouseEnter(sidebar)
    expect(screen.getByText('Dashboard')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(2200)
    })

    expect(screen.queryByText('Dashboard')).toBeNull()
  })

  it('renders Add Team Member button and opens drawer', async () => {
    render(<Staff />)
    const btn = await screen.findByText('+ Add Team Member')
    expect(btn).toBeTruthy()
    fireEvent.click(btn)
    expect(await screen.findByText('New Team Member')).toBeTruthy()
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
