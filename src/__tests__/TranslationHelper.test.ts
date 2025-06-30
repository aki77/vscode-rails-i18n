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
const mockGetLocalizeKeyAtPosition = vi.fn()
vi.mock('../KeyDetector.js', () => ({
  asAbsoluteKey: vi.fn((key: string) => (key.startsWith('.') ? null : key)),
  getLocalizeKeyAtPosition: mockGetLocalizeKeyAtPosition,
}))

// Mock for LocalizeUtils
vi.mock('../LocalizeUtils.js', () => ({
  getLocalizeFormatKey: vi.fn((formatKey: string, type?: string) => {
    if (type === 'date') {
      return [`date.formats.${formatKey}`]
    }
    if (type === 'time') {
      return [`time.formats.${formatKey}`]
    }
    return [`date.formats.${formatKey}`, `time.formats.${formatKey}`]
  }),
}))

let getMultiLanguageTranslationForKey: any
let getMultiLanguageTranslationForPosition: any
let getLocalizeTranslationForKey: any
let getLocalizeTranslationForPosition: any

beforeAll(async () => {
  const module = await import('../TranslationHelper.js')
  getMultiLanguageTranslationForKey = module.getMultiLanguageTranslationForKey
  getMultiLanguageTranslationForPosition =
    module.getMultiLanguageTranslationForPosition
  getLocalizeTranslationForKey = module.getLocalizeTranslationForKey
  getLocalizeTranslationForPosition = module.getLocalizeTranslationForPosition
})

// Mock for I18n
function createMockI18n(translations: Record<string, Record<string, any>>) {
  return {
    get: (key: string) => {
      // Find the translation in any locale (for single translation lookups)
      for (const locale of Object.keys(translations)) {
        if (translations[locale][key]) {
          return translations[locale][key]
        }
      }
      return undefined
    },
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

  describe('getLocalizeTranslationForKey', () => {
    it('should return translation for date format key', () => {
      const translations = {
        en: {
          'date.formats.short': { locale: 'en', value: '%m/%d/%Y', path: '/en.yml' },
        },
      }

      const mockI18n = createMockI18n(translations)

      const result = getLocalizeTranslationForKey(mockI18n, 'short', 'date')

      expect(result).toBeDefined()
      expect(result.key).toBe('short') // Original format key
      expect(result.normalizedKey).toBe('date.formats.short')
      expect(result.translation).toBeDefined()
      expect(result.translation.value).toBe('%m/%d/%Y')
    })

    it('should return translation for time format key', () => {
      const translations = {
        en: {
          'time.formats.default': { locale: 'en', value: '%a, %d %b %Y %H:%M:%S %z', path: '/en.yml' },
        },
      }

      const mockI18n = createMockI18n(translations)

      const result = getLocalizeTranslationForKey(mockI18n, 'default', 'time')

      expect(result).toBeDefined()
      expect(result.key).toBe('default') // Original format key
      expect(result.normalizedKey).toBe('time.formats.default')
      expect(result.translation).toBeDefined()
      expect(result.translation.value).toBe('%a, %d %b %Y %H:%M:%S %z')
    })

    it('should try both date and time when type is not specified', () => {
      const translations = {
        en: {
          'time.formats.short': { locale: 'en', value: '%d %b %H:%M', path: '/en.yml' },
          // No date.formats.short
        },
      }

      const mockI18n = createMockI18n(translations)

      const result = getLocalizeTranslationForKey(mockI18n, 'short')

      expect(result).toBeDefined()
      expect(result.key).toBe('short')
      expect(result.normalizedKey).toBe('time.formats.short') // Should find time format
      expect(result.translation).toBeDefined()
      expect(result.translation.value).toBe('%d %b %H:%M')
    })

    it('should return undefined translation when key not found', () => {
      const translations = {
        en: {},
      }

      const mockI18n = createMockI18n(translations)

      const result = getLocalizeTranslationForKey(mockI18n, 'nonexistent', 'date')

      expect(result).toBeDefined()
      expect(result.key).toBe('nonexistent')
      expect(result.normalizedKey).toBe('date.formats.nonexistent')
      expect(result.translation).toBeUndefined()
    })
  })

  describe('getLocalizeTranslationForPosition', () => {
    it('should return translation for localize method at position', () => {
      const translations = {
        en: {
          'date.formats.short': { locale: 'en', value: '%m/%d/%Y', path: '/en.yml' },
        },
      }

      const mockI18n = createMockI18n(translations)
      const mockDocument = createMockDocument()

      // Mock getLocalizeKeyAtPosition to return localize key info
      mockGetLocalizeKeyAtPosition.mockReturnValue({
        keys: ['date.formats.short'],
        range: {},
        methodInfo: {
          formatKey: 'short',
          methodName: 'l',
          variableName: 'user.created_at',
          type: 'date',
        },
      })

      const result = getLocalizeTranslationForPosition(
        mockI18n,
        mockDocument,
        { line: 0, character: 0 }
      )

      expect(result).toBeDefined()
      expect(result.key).toBe('short') // Original format key
      expect(result.normalizedKey).toBe('date.formats.short')
      expect(result.translation).toBeDefined()
      expect(result.translation.value).toBe('%m/%d/%Y')
    })

    it('should return undefined when no localize method at position', () => {
      const translations = {
        en: {
          'date.formats.short': { locale: 'en', value: '%m/%d/%Y', path: '/en.yml' },
        },
      }

      const mockI18n = createMockI18n(translations)
      const mockDocument = createMockDocument()

      // Mock getLocalizeKeyAtPosition to return null
      mockGetLocalizeKeyAtPosition.mockReturnValue(undefined)

      const result = getLocalizeTranslationForPosition(
        mockI18n,
        mockDocument,
        { line: 0, character: 0 }
      )

      expect(result).toBeUndefined()
    })

    it('should handle multiple possible keys and return first match', () => {
      const translations = {
        en: {
          'time.formats.short': { locale: 'en', value: '%d %b %H:%M', path: '/en.yml' },
          // No date.formats.short
        },
      }

      const mockI18n = createMockI18n(translations)
      const mockDocument = createMockDocument()

      // Mock getLocalizeKeyAtPosition to return multiple possible keys
      mockGetLocalizeKeyAtPosition.mockReturnValue({
        keys: ['date.formats.short', 'time.formats.short'],
        range: {},
        methodInfo: {
          formatKey: 'short',
          methodName: 'l',
          variableName: 'unknown_var',
          type: undefined,
        },
      })

      const result = getLocalizeTranslationForPosition(
        mockI18n,
        mockDocument,
        { line: 0, character: 0 }
      )

      expect(result).toBeDefined()
      expect(result.key).toBe('short')
      expect(result.normalizedKey).toBe('time.formats.short') // Should find time format (second key)
      expect(result.translation).toBeDefined()
      expect(result.translation.value).toBe('%d %b %H:%M')
    })
  })
})
