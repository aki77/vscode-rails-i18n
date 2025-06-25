import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { TextDocument } from 'vscode'

// Mock for VSCode API
vi.mock('vscode', () => ({
  Range: vi.fn((start: any, end: any) => ({ start, end })),
  Position: vi.fn((line: number, character: number) => ({ line, character })),
}))

// Mock for utils
vi.mock('../utils.js', () => ({
  priorityOfLocales: vi.fn(() => ['en', 'ja', 'fr']),
}))

// Mock for KeyDetector
vi.mock('../KeyDetector.js', () => ({
  asAbsoluteKey: vi.fn((key: string) => (key.startsWith('.') ? null : key)),
}))

let getMultiLanguageTranslationForKey: any
let getMultiLanguageTranslationForPosition: any

beforeAll(async () => {
  const module = await import('../TranslationHelper.js')
  getMultiLanguageTranslationForKey = module.getMultiLanguageTranslationForKey
  getMultiLanguageTranslationForPosition =
    module.getMultiLanguageTranslationForPosition
})

// Mock for I18n
function createMockI18n(translations: Record<string, Record<string, any>>) {
  return {
    getByLocale: (key: string, locale: string) => {
      return translations[locale]?.[key]
    },
    getKeyAndRange: () => ({ key: 'user.name', range: {} }),
  }
}

// Mock for TextDocument
function createMockDocument(): TextDocument {
  return {
    uri: { path: '/app/views/users/index.html.erb' },
  } as TextDocument
}

describe('TranslationHelper Multi-Language Support', () => {
  describe('getMultiLanguageTranslationForKey', () => {
    it('should return translations for all configured locales', () => {
      const translations = {
        en: {
          'user.name': { locale: 'en', value: 'Name', path: '/en.yml' },
        },
        ja: {
          'user.name': { locale: 'ja', value: '名前', path: '/ja.yml' },
        },
        fr: {
          'user.name': { locale: 'fr', value: 'Nom', path: '/fr.yml' },
        },
      }

      const mockI18n = createMockI18n(translations)
      const mockDocument = createMockDocument()

      const result = getMultiLanguageTranslationForKey(
        mockI18n,
        mockDocument,
        'user.name'
      )

      expect(result).toBeDefined()
      expect(result.key).toBe('user.name')
      expect(result.normalizedKey).toBe('user.name')
      expect(result.localeResults).toHaveLength(3)

      // Check English translation
      expect(result.localeResults[0].locale).toBe('en')
      expect(result.localeResults[0].translation).toBeDefined()
      expect(result.localeResults[0].translation.value).toBe('Name')

      // Check Japanese translation
      expect(result.localeResults[1].locale).toBe('ja')
      expect(result.localeResults[1].translation).toBeDefined()
      expect(result.localeResults[1].translation.value).toBe('名前')

      // Check French translation
      expect(result.localeResults[2].locale).toBe('fr')
      expect(result.localeResults[2].translation).toBeDefined()
      expect(result.localeResults[2].translation.value).toBe('Nom')
    })

    it('should handle missing translations for some locales', () => {
      const translations = {
        en: {
          'user.name': { locale: 'en', value: 'Name', path: '/en.yml' },
        },
        ja: {
          // missing 'user.name'
        },
        fr: {
          'user.name': { locale: 'fr', value: 'Nom', path: '/fr.yml' },
        },
      }

      const mockI18n = createMockI18n(translations)
      const mockDocument = createMockDocument()

      const result = getMultiLanguageTranslationForKey(
        mockI18n,
        mockDocument,
        'user.name'
      )

      expect(result).toBeDefined()
      expect(result.localeResults).toHaveLength(3)

      // Check English translation (exists)
      expect(result.localeResults[0].translation).toBeDefined()
      expect(result.localeResults[0].translation.value).toBe('Name')

      // Check Japanese translation (missing)
      expect(result.localeResults[1].translation).toBeUndefined()

      // Check French translation (exists)
      expect(result.localeResults[2].translation).toBeDefined()
      expect(result.localeResults[2].translation.value).toBe('Nom')
    })

    it('should handle no translations for any locale', () => {
      const translations = {
        en: {},
        ja: {},
        fr: {},
      }

      const mockI18n = createMockI18n(translations)
      const mockDocument = createMockDocument()

      const result = getMultiLanguageTranslationForKey(
        mockI18n,
        mockDocument,
        'user.name'
      )

      expect(result).toBeDefined()
      expect(result.localeResults).toHaveLength(3)

      // All translations should be missing
      result.localeResults.forEach((localeResult: any) => {
        expect(localeResult.translation).toBeUndefined()
      })
    })

    it('should return undefined for invalid key', () => {
      const translations = {
        en: { 'user.name': { locale: 'en', value: 'Name' } },
      }

      const mockI18n = createMockI18n(translations)
      const mockDocument = createMockDocument()

      // Test with lazy lookup key (starts with .)
      const result = getMultiLanguageTranslationForKey(
        mockI18n,
        mockDocument,
        '.invalid'
      )

      expect(result).toBeUndefined()
    })
  })

  describe('getMultiLanguageTranslationForPosition', () => {
    it('should return translation results for position', async () => {
      const translations = {
        en: {
          'user.name': { locale: 'en', value: 'Name', path: '/en.yml' },
        },
        ja: {
          'user.name': { locale: 'ja', value: '名前', path: '/ja.yml' },
        },
      }

      const mockI18n = createMockI18n(translations)
      const mockDocument = createMockDocument()

      const result = await getMultiLanguageTranslationForPosition(
        mockI18n,
        mockDocument,
        { line: 0, character: 0 }
      )

      expect(result).toBeDefined()
      expect(result.key).toBe('user.name')
      expect(result.localeResults).toHaveLength(3) // en, ja, fr (fr is missing)
    })

    it('should return undefined when no key found at position', async () => {
      const translations = {
        en: { 'user.name': { locale: 'en', value: 'Name' } },
      }

      const mockI18n = {
        ...createMockI18n(translations),
        getKeyAndRange: async () => null, // No key found at position
      }
      const mockDocument = createMockDocument()

      const result = await getMultiLanguageTranslationForPosition(
        mockI18n,
        mockDocument,
        { line: 0, character: 0 }
      )

      expect(result).toBeUndefined()
    })
  })
})
