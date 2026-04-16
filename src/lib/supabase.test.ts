import { describe, it, expect, vi } from 'vitest'

// Mock env vars before importing
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')

const { supabase } = await import('./supabase')

describe('supabase client', () => {
  it('should be defined', () => {
    expect(supabase).toBeDefined()
  })

  it('should have auth property', () => {
    expect(supabase.auth).toBeDefined()
  })

  it('should have from method', () => {
    expect(typeof supabase.from).toBe('function')
  })
})
