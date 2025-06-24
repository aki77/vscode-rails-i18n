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
}))

let I18nHoverProvider: any
let getMultiLanguageTranslationForPosition: any

beforeAll(async () => {
  const hoverModule = await import('../I18nHoverProvider.js')
  const helperModule = await import('../TranslationHelper.js')
  I18nHoverProvider = hoverModule.default
  getMultiLanguageTranslationForPosition =
    helperModule.getMultiLanguageTranslationForPosition
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
    it('should return hover with multiple language translations', () => {
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

      vi.mocked(getMultiLanguageTranslationForPosition).mockReturnValue(
        mockResult
      )

      const document = createMockDocument()
      const position = { line: 0, character: 0 }

      const result = hoverProvider.provideHover(document, position)

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

    it('should return undefined when no translations found', () => {
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

      vi.mocked(getMultiLanguageTranslationForPosition).mockReturnValue(
        mockResult
      )

      const document = createMockDocument()
      const position = { line: 0, character: 0 }

      const result = hoverProvider.provideHover(document, position)

      expect(result).toBeUndefined()
    })

    it('should return undefined when no result from translation helper', () => {
      vi.mocked(getMultiLanguageTranslationForPosition).mockReturnValue(
        undefined
      )

      const document = createMockDocument()
      const position = { line: 0, character: 0 }

      const result = hoverProvider.provideHover(document, position)

      expect(result).toBeUndefined()
    })

    it('should return undefined when no key found at position', () => {
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

      vi.mocked(getMultiLanguageTranslationForPosition).mockReturnValue(
        mockResult
      )
      mockI18n.getKeyAndRange.mockReturnValue(null) // No key found

      const document = createMockDocument()
      const position = { line: 0, character: 0 }

      const result = hoverProvider.provideHover(document, position)

      expect(result).toBeUndefined()
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
