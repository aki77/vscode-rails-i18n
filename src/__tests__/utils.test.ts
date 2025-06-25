import { describe, expect, it, vi } from 'vitest'

// Mock for VSCode API
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn().mockReturnValue({
      priorityOfLocales: ['en', 'ja'],
    }),
  },
}))

import { availableLocale, priorityOfLocales } from '../utils.js'

describe('utils', () => {
  describe('priorityOfLocales', () => {
    it('should return priority locales from config', () => {
      const result = priorityOfLocales()
      expect(result).toEqual(['en', 'ja'])
    })
  })

  describe('availableLocale', () => {
    it('should return true for available locale', () => {
      expect(availableLocale('en')).toBe(true)
      expect(availableLocale('ja')).toBe(true)
    })

    it('should return false for unavailable locale', () => {
      expect(availableLocale('fr')).toBe(false)
      expect(availableLocale('de')).toBe(false)
    })
  })
})
