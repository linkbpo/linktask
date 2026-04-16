import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

function TestComponent() {
  const { user, loading } = useAuth()
  return <div>{loading ? 'loading' : user ? 'logged in' : 'logged out'}</div>
}

describe('AuthContext', () => {
  it('renders without crashing', () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    expect(screen.getByText('loading')).toBeTruthy()
  })

  it('throws when used outside AuthProvider', () => {
    // Suppress React error boundary output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within AuthProvider')
    spy.mockRestore()
  })
})
