import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCredits, spendCredits } from '../api'

// These tests are simple unit tests that mock fetch

beforeEach(() => {
  vi.resetAllMocks()
})

describe('Credits API', () => {
  it('getCredits returns remaining', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ remaining: 42 }) })) as any
    const res = await getCredits('guest')
    expect(res.remaining).toBe(42)
  })

  it('spendCredits throws when backend returns error', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ detail: 'No credits' }) })) as any
    await expect(spendCredits('guest')).rejects.toBeInstanceOf(Error)
  })
})