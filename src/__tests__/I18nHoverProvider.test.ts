import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TextDocument } from 'vscode'

// Mock for VSCode API
vi.mock('vscode', () => ({
  Range: vi.fn((start: any, end: any) => ({ start, end })),
  Position: vi.fn((line: number, character: number) => ({ line, character })),
  Hover: vi.fn((content: any, range: any) => ({ content, range })),
  MarkdownString: vi.fn().mockImplementation(function (
    this: any,
    content?: string
  ) {
    this.supportHtml = false
    this.isTrusted = false
    this.value = content || ''
    this.appendText = vi.fn((text: string) => {
      this.value += text
    })
    return this
  }),
}))

// Mock for TranslationHelper
vi.mock('../TranslationHelper.js', () => ({
  getMultiLanguageTranslationForPosition: vi.fn(),
  getLocalizeTranslationForPosition: vi.fn(),
  getMultiLanguageLocalizeTranslationForPosition: vi.fn(),
}))

let I18nHoverProvider: any
let getMultiLanguageTranslationForPosition: any
let getMultiLanguageLocalizeTranslationForPosition: any

beforeAll(async () => {
  const hoverModule = await import('../I18nHoverProvider.js')
  const helperModule = await import('../TranslationHelper.js')
  I18nHoverProvider = hoverModule.default
  getMultiLanguageTranslationForPosition =
    helperModule.getMultiLanguageTranslationForPosition
  getMultiLanguageLocalizeTranslationForPosition =
    helperModule.getMultiLanguageLocalizeTranslationForPosition
})

// Mock for I18n
function createMockI18n() {
  return {
    getKeyAndRange: vi.fn(() => ({
      key: 'user.name',
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 9 },
      },
    })),
  }
}

// Mock for TextDocument
function createMockDocument(): TextDocument {
  return {
    uri: { path: '/app/views/users/index.html.erb' },
  } as TextDocument
}

describe('I18nHoverProvider Multi-Language Support', () => {
  let hoverProvider: any
  let mockI18n: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockI18n = createMockI18n()
    hoverProvider = new I18nHoverProvider(mockI18n)
  })

  describe('provideHover', () => {
    it('should return hover with multiple language translations', async () => {
      const mockResult = {
        key: 'user.name',
        normalizedKey: 'user.name',
        localeResults: [
          {
            locale: 'en',
            translation: {
              locale: 'en',
              value: 'Name',
              path: '/en.yml',
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 4 },
              },
            },
          },
          {
            locale: 'ja',
            translation: {
              locale: 'ja',
              value: '名前',
              path: '/ja.yml',
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 2 },
              },
            },
          },
          {
            locale: 'fr',
            translation: undefined,
          },
        ],
      }

      vi.mocked(getMultiLanguageTranslationForPosition).mockResolvedValue(
        mockResult
      )

      const document = createMockDocument()
      const position = { line: 0, character: 0 }

      const result = await hoverProvider.provideHover(document, position)

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      expect(result.range).toBeDefined()

      // Check that the markdown content includes all locales in table format and jump icons
      const markdownString = result.content
      expect(markdownString.value).toContain('Locale')
      expect(markdownString.value).toContain('Translation')
      expect(markdownString.value).toContain('en')
      expect(markdownString.value).toContain('Name')
      expect(markdownString.value).toContain('ja')
      expect(markdownString.value).toContain('名前')
      expect(markdownString.value).toContain('fr')
      expect(markdownString.value).toContain('[missing translation]')
      expect(markdownString.value).toContain('$(go-to-file)')
      expect(markdownString.value).toContain(
        'command:railsI18n.gotoTranslationByLocale'
      )
      expect(markdownString.isTrusted).toBe(true)
    })

    it('should return undefined when no translations found', async () => {
      const mockResult = {
        key: 'user.name',
        normalizedKey: 'user.name',
        localeResults: [
          {
            locale: 'en',
            translation: undefined,
          },
          {
            locale: 'ja',
            translation: undefined,
          },
        ],
      }

      vi.mocked(getMultiLanguageTranslationForPosition).mockResolvedValue(
        mockResult
      )

      const document = createMockDocument()
      const position = { line: 0, character: 0 }

      const result = await hoverProvider.provideHover(document, position)

      expect(result).toBeUndefined()
    })

    it('should return undefined when no result from translation helper', async () => {
      vi.mocked(getMultiLanguageTranslationForPosition).mockResolvedValue(
        undefined
      )

      const document = createMockDocument()
      const position = { line: 0, character: 0 }

      const result = await hoverProvider.provideHover(document, position)

      expect(result).toBeUndefined()
    })

    it('should return undefined when no key found at position', async () => {
      const mockResult = {
        key: 'user.name',
        normalizedKey: 'user.name',
        localeResults: [
          {
            locale: 'en',
            translation: { locale: 'en', value: 'Name', path: '/en.yml' },
          },
        ],
      }

      vi.mocked(getMultiLanguageTranslationForPosition).mockResolvedValue(
        mockResult
      )
      mockI18n.getKeyAndRange.mockResolvedValue(null) // No key found

      const document = createMockDocument()
      const position = { line: 0, character: 0 }

      const result = await hoverProvider.provideHover(document, position)

      expect(result).toBeUndefined()
    })

    it('should return hover for localize method when no regular i18n key found', async () => {
      // Mock getMultiLanguageTranslationForPosition to return undefined (no regular i18n key)
      vi.mocked(getMultiLanguageTranslationForPosition).mockResolvedValue(
        undefined
      )

      // Mock getMultiLanguageLocalizeTranslationForPosition to return localize translation
      const mockLocalizeResult = {
        key: 'short',
        normalizedKey: 'date.formats.short',
        localeResults: [
          {
            locale: 'en',
            translation: {
              locale: 'en',
              value: '%b %d',
              path: '/en.yml',
              range: {
                start: { line: 10, character: 8 },
                end: { line: 10, character: 13 },
              },
            },
          },
          {
            locale: 'ja',
            translation: {
              locale: 'ja',
              value: '%m月%d日',
              path: '/ja.yml',
              range: {
                start: { line: 10, character: 8 },
                end: { line: 10, character: 15 },
              },
            },
          },
        ],
      }

      vi.mocked(getMultiLanguageLocalizeTranslationForPosition).mockReturnValue(
        mockLocalizeResult
      )

      const document = createMockDocument()
      const position = { line: 0, character: 20 } // Position on format key in localize method

      const result = await hoverProvider.provideHover(document, position)

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()

      // Check that the markdown content shows the localize format translation for multiple locales
      const markdownString = result.content
      expect(markdownString.value).toContain('en')
      expect(markdownString.value).toContain('%b %d')
      expect(markdownString.value).toContain('ja')
      expect(markdownString.value).toContain('%m月%d日')
      expect(markdownString.value).toContain('$(go-to-file)')
      expect(markdownString.isTrusted).toBe(true)
    })

    it('should return undefined for localize method when no translation found', async () => {
      // Mock getMultiLanguageTranslationForPosition to return undefined (no regular i18n key)
      vi.mocked(getMultiLanguageTranslationForPosition).mockResolvedValue(
        undefined
      )

      // Mock getMultiLanguageLocalizeTranslationForPosition to return result without translations
      const mockLocalizeResult = {
        key: 'unknown',
        normalizedKey: 'date.formats.unknown',
        localeResults: [
          {
            locale: 'en',
            translation: undefined,
          },
          {
            locale: 'ja',
            translation: undefined,
          },
        ],
      }

      vi.mocked(getMultiLanguageLocalizeTranslationForPosition).mockReturnValue(
        mockLocalizeResult
      )

      const document = createMockDocument()
      const position = { line: 0, character: 20 }

      const result = await hoverProvider.provideHover(document, position)

      expect(result).toBeUndefined()
    })

    it('should prioritize regular i18n keys over localize method', async () => {
      // Mock getMultiLanguageTranslationForPosition to return regular i18n result
      const mockI18nResult = {
        key: 'user.name',
        normalizedKey: 'user.name',
        localeResults: [
          {
            locale: 'en',
            translation: {
              locale: 'en',
              value: 'Name',
              path: '/en.yml',
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 4 },
              },
            },
          },
        ],
      }

      vi.mocked(getMultiLanguageTranslationForPosition).mockResolvedValue(
        mockI18nResult
      )

      // Mock getMultiLanguageLocalizeTranslationForPosition (should not be called)
      const mockLocalizeResult = {
        key: 'short',
        normalizedKey: 'date.formats.short',
        localeResults: [
          {
            locale: 'en',
            translation: {
              locale: 'en',
              value: '%b %d',
              path: '/en.yml',
              range: {
                start: { line: 10, character: 8 },
                end: { line: 10, character: 13 },
              },
            },
          },
        ],
      }

      vi.mocked(getMultiLanguageLocalizeTranslationForPosition).mockReturnValue(
        mockLocalizeResult
      )

      const document = createMockDocument()
      const position = { line: 0, character: 0 }

      const result = await hoverProvider.provideHover(document, position)

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()

      // Should show regular i18n translation, not localize translation
      const markdownString = result.content
      expect(markdownString.value).toContain('Name')
      expect(markdownString.value).not.toContain('%b %d')
      expect(
        getMultiLanguageLocalizeTranslationForPosition
      ).not.toHaveBeenCalled()
    })

    it('should handle human_attribute_name pattern hover', async () => {
      const mockResult = {
        key: 'activerecord.attributes.users.name',
        normalizedKey: 'activerecord.attributes.users.name',
        localeResults: [
          {
            locale: 'en',
            translation: {
              locale: 'en',
              value: 'Full Name',
              path: '/en.yml',
              range: {
                start: { line: 5, character: 8 },
                end: { line: 5, character: 17 },
              },
            },
          },
          {
            locale: 'ja',
            translation: {
              locale: 'ja',
              value: '氏名',
              path: '/ja.yml',
              range: {
                start: { line: 5, character: 8 },
                end: { line: 5, character: 10 },
              },
            },
          },
        ],
      }

      vi.mocked(getMultiLanguageTranslationForPosition).mockResolvedValue(
        mockResult
      )
      mockI18n.getKeyAndRange.mockResolvedValue({
        key: 'activerecord.attributes.users.name',
        range: {
          start: { line: 0, character: 25 },
          end: { line: 0, character: 29 },
        },
      })

      const document = createMockDocument()
      const position = { line: 0, character: 27 } // Position on 'name' in 'User.human_attribute_name :name'

      const result = await hoverProvider.provideHover(document, position)

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      expect(result.range).toBeDefined()

      const markdownString = result.content
      expect(markdownString.value).toContain('Full Name')
      expect(markdownString.value).toContain('氏名')
      expect(markdownString.isTrusted).toBe(true)
    })
  })

  describe('formatMultiLanguageTranslations', () => {
    it('should format translations with proper markdown', () => {
      const mockResult = {
        key: 'user.name',
        normalizedKey: 'user.name',
        localeResults: [
          {
            locale: 'en',
            translation: {
              locale: 'en',
              value: 'Name',
              path: '/en.yml',
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 4 },
              },
            },
          },
          {
            locale: 'ja',
            translation: {
              locale: 'ja',
              value: '名前',
              path: '/ja.yml',
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 2 },
              },
            },
          },
          {
            locale: 'fr',
            translation: undefined,
          },
        ],
      }

      const markdown = hoverProvider.formatMultiLanguageTranslations(mockResult)

      expect(markdown.value).toContain('en')
      expect(markdown.value).toContain('Name')
      expect(markdown.value).toContain('ja')
      expect(markdown.value).toContain('名前')
      expect(markdown.value).toContain('fr')
      expect(markdown.value).toContain('[missing translation]')
      expect(markdown.value).toContain('$(go-to-file)')
      expect(markdown.value).toContain(
        'command:railsI18n.gotoTranslationByLocale'
      )
      expect(markdown.supportHtml).toBe(false)
      expect(markdown.isTrusted).toBe(true)
    })

    it('should handle empty localeResults', () => {
      const mockResult = {
        key: 'user.name',
        normalizedKey: 'user.name',
        localeResults: [],
      }

      const markdown = hoverProvider.formatMultiLanguageTranslations(mockResult)

      expect(markdown.value).toBe('')
    })
  })
})
