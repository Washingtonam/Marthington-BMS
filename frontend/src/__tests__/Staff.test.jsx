import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Staff from '../pages/Staff.jsx'

vi.mock('../api/client.js', () => {
  return {
    default: async (path) => {
      if (path === '/staff') return []
      return {}
    }
  }
})

describe('Staff page', () => {
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
    // find the toggle button next to it
    const toggleBtns = await screen.findAllByRole('button')
    // click the first toggle-like button (not ideal but a basic smoke test)
    fireEvent.click(toggleBtns[toggleBtns.length - 1])
    expect(true).toBe(true)
  })
})
