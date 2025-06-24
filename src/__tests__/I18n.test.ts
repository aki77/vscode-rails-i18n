import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Range, workspace, type Uri } from 'vscode'

// Mock for VSCode API
vi.mock('vscode', () => ({
  Range: vi.fn((start: any, end: any) => ({ start, end })),
  Position: vi.fn((line: number, character: number) => ({ line, character })),
  RelativePattern: vi.fn(),
  ProgressLocation: { Window: 1 },
  workspace: {
    findFiles: vi.fn(),
    workspaceFolders: [],
    createFileSystemWatcher: vi.fn(),
    getConfiguration: vi.fn(),
    openTextDocument: vi.fn(),
  },
  window: {
    withProgress: vi.fn(),
  },
}))

// Mock for Parser
vi.mock('../Parser.js', () => ({
  Parser: vi.fn().mockImplementation(() => ({
    parse: vi.fn(),
  })),
}))

// Mock for utils
vi.mock('../utils.js', () => ({
  priorityOfLocales: vi.fn(() => ['en', 'ja']),
  availableLocale: vi.fn(() => true),
}))

describe('I18n MVP Features', () => {
  let I18n: any
  let Parser: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Import modules after mocking
    const i18nModule = await import('../i18n.js')
    const parserModule = await import('../Parser.js')
    I18n = i18nModule.default
    Parser = parserModule.Parser

    // Setup mock workspace
    vi.mocked(workspace.findFiles).mockResolvedValue([
      { path: '/config/locales/en.yml' } as Uri,
      { path: '/config/locales/ja.yml' } as Uri,
    ])

    vi.mocked(workspace.createFileSystemWatcher).mockReturnValue({
      onDidChange: vi.fn(),
      dispose: vi.fn(),
    } as any)

    vi.mocked(workspace.getConfiguration).mockReturnValue({
      translateMethods: ['t', 'I18n.t'],
      localizeMethods: ['l', 'I18n.l'],
    } as any)

    // Mock window.withProgress to execute callback immediately
    vi.mocked(workspace.findFiles).mockResolvedValue([])
  })

  describe('MVP Multi-locale Support', () => {
    it('should store locale-specific translations', async () => {
      // Setup parser mock to return multi-locale data
      const mockParserInstance = {
        parse: vi.fn().mockResolvedValue([
          [
            'en',
            {
              'user.name': {
                locale: 'en',
                path: '/en.yml',
                value: 'Name',
                range: new Range({} as any, {} as any),
              },
            },
          ],
          [
            'ja',
            {
              'user.name': {
                locale: 'ja',
                path: '/ja.yml',
                value: '名前',
                range: new Range({} as any, {} as any),
              },
            },
          ],
        ]),
      }

      vi.mocked(Parser).mockImplementation(() => mockParserInstance)

      const i18n = new I18n('config/locales/*.yml')

      // Mock the progress callback to execute immediately
      vi.mocked(workspace.findFiles).mockResolvedValue([
        { path: '/config/locales/en.yml' } as Uri,
        { path: '/config/locales/ja.yml' } as Uri,
      ])

      // Manually trigger the parse logic to test
      const result = await (i18n as any).parse()

      expect(result).toBeInstanceOf(Map)
      expect(result.has('en')).toBe(true)
      expect(result.has('ja')).toBe(true)
    })

    it('should provide getByLocale method', () => {
      const i18n = new I18n('config/locales/*.yml')

      // Set up test data manually
      const mockTranslation = {
        locale: 'ja',
        path: '/ja.yml',
        value: '名前',
        range: new Range({} as any, {} as any),
      }

      ;(i18n as any).localeTranslations.set(
        'ja',
        new Map([['user.name', mockTranslation]])
      )

      const result = i18n.getByLocale('user.name', 'ja')
      expect(result).toEqual(mockTranslation)
    })

    it('should return undefined for non-existent locale', () => {
      const i18n = new I18n('config/locales/*.yml')

      const result = i18n.getByLocale('user.name', 'fr')
      expect(result).toBeUndefined()
    })

    it('should return undefined for non-existent key in existing locale', () => {
      const i18n = new I18n('config/locales/*.yml')

      ;(i18n as any).localeTranslations.set('ja', new Map())

      const result = i18n.getByLocale('user.email', 'ja')
      expect(result).toBeUndefined()
    })

    it('should provide getAvailableLocales method', () => {
      const i18n = new I18n('config/locales/*.yml')

      // Set up test data
      ;(i18n as any).localeTranslations.set('en', new Map())
      ;(i18n as any).localeTranslations.set('ja', new Map())
      ;(i18n as any).localeTranslations.set('fr', new Map())

      const locales = i18n.getAvailableLocales()
      expect(locales).toEqual(['en', 'ja', 'fr'])
    })

    it('should return empty array when no locales are available', () => {
      const i18n = new I18n('config/locales/*.yml')

      const locales = i18n.getAvailableLocales()
      expect(locales).toEqual([])
    })
  })

  describe('Backward Compatibility', () => {
    it('should return primary locale translation with get() method', () => {
      const i18n = new I18n('config/locales/*.yml')

      // Set up test data for primary locale (en)
      const enTranslation = {
        locale: 'en',
        path: '/en.yml',
        value: 'Name',
        range: new Range({} as any, {} as any),
      }

      // Set up test data for secondary locale (ja)
      const jaTranslation = {
        locale: 'ja',
        path: '/ja.yml',
        value: '名前',
        range: new Range({} as any, {} as any),
      }

      ;(i18n as any).localeTranslations.set(
        'en',
        new Map([['user.name', enTranslation]])
      )
      ;(i18n as any).localeTranslations.set(
        'ja',
        new Map([['user.name', jaTranslation]])
      )

      // Should return primary locale (en) translation
      const result = i18n.get('user.name')
      expect(result).toEqual(enTranslation)
    })

    it('should return primary locale entries with entries() method', () => {
      const i18n = new I18n('config/locales/*.yml')

      // Set up test data for primary locale (en)
      const enTranslation = {
        locale: 'en',
        path: '/en.yml',
        value: 'Name',
        range: new Range({} as any, {} as any),
      }

      ;(i18n as any).localeTranslations.set(
        'en',
        new Map([['user.name', enTranslation]])
      )
      ;(i18n as any).localeTranslations.set(
        'ja',
        new Map([
          ['user.name', { locale: 'ja', path: '/ja.yml', value: '名前' }],
        ])
      )

      const entries = Array.from(i18n.entries())
      expect(entries).toHaveLength(1)
      expect(entries[0]).toEqual(['user.name', enTranslation])
    })

    it('should return undefined when primary locale has no translation', () => {
      const i18n = new I18n('config/locales/*.yml')

      // Set up test data only for secondary locale (ja)
      const jaTranslation = {
        locale: 'ja',
        path: '/ja.yml',
        value: '名前',
        range: new Range({} as any, {} as any),
      }

      ;(i18n as any).localeTranslations.set('en', new Map()) // Empty primary locale
      ;(i18n as any).localeTranslations.set(
        'ja',
        new Map([['user.name', jaTranslation]])
      )

      // Should return undefined since primary locale (en) has no translation
      const result = i18n.get('user.name')
      expect(result).toBeUndefined()
    })
  })

  describe('Memory Management', () => {
    it('should clear locale translations map on dispose', () => {
      const i18n = new I18n('config/locales/*.yml')

      // Set up test data
      ;(i18n as any).localeTranslations.set('en', new Map())

      expect((i18n as any).localeTranslations.size).toBe(1)

      i18n.dispose()

      expect((i18n as any).localeTranslations.size).toBe(0)
    })
  })

  describe('Multiple files with same locale', () => {
    it('should merge translations from multiple files with same locale', async () => {
      // Setup parser mock to return multiple files with same locale
      const mockParserInstance = {
        parse: vi
          .fn()
          .mockResolvedValueOnce([
            [
              'ja',
              {
                hello: {
                  locale: 'ja',
                  path: '/ja.yml',
                  value: 'hoge',
                  range: new Range({} as any, {} as any),
                },
              },
            ],
          ])
          .mockResolvedValueOnce([
            [
              'ja',
              {
                test: {
                  locale: 'ja',
                  path: '/app.yml',
                  value: 'dummy',
                  range: new Range({} as any, {} as any),
                },
              },
            ],
          ]),
      }

      vi.mocked(Parser).mockImplementation(() => mockParserInstance)

      const i18n = new I18n('config/locales/*.yml')

      // Mock findFiles to return two files
      vi.mocked(workspace.findFiles).mockResolvedValue([
        { path: '/config/locales/ja.yml' } as Uri,
        { path: '/config/locales/app.yml' } as Uri,
      ])

      // Parse the files
      const result = await (i18n as any).parse()

      // Should have both translations merged under 'ja' locale
      expect(result.has('ja')).toBe(true)
      const jaTranslations = result.get('ja')
      expect(jaTranslations.has('hello')).toBe(true)
      expect(jaTranslations.has('test')).toBe(true)
      expect(jaTranslations.get('hello').value).toBe('hoge')
      expect(jaTranslations.get('test').value).toBe('dummy')
    })

    it('should handle key conflicts by using the last processed file', async () => {
      // Setup parser mock to return multiple files with same locale and same key
      const mockParserInstance = {
        parse: vi
          .fn()
          .mockResolvedValueOnce([
            [
              'ja',
              {
                greeting: {
                  locale: 'ja',
                  path: '/ja.yml',
                  value: 'first value',
                  range: new Range({} as any, {} as any),
                },
              },
            ],
          ])
          .mockResolvedValueOnce([
            [
              'ja',
              {
                greeting: {
                  locale: 'ja',
                  path: '/app.yml',
                  value: 'second value',
                  range: new Range({} as any, {} as any),
                },
              },
            ],
          ]),
      }

      vi.mocked(Parser).mockImplementation(() => mockParserInstance)

      const i18n = new I18n('config/locales/*.yml')

      // Mock findFiles to return two files
      vi.mocked(workspace.findFiles).mockResolvedValue([
        { path: '/config/locales/ja.yml' } as Uri,
        { path: '/config/locales/app.yml' } as Uri,
      ])

      // Parse the files
      const result = await (i18n as any).parse()

      // Should use the value from the last processed file
      expect(result.has('ja')).toBe(true)
      const jaTranslations = result.get('ja')
      expect(jaTranslations.get('greeting').value).toBe('second value')
    })
  })
})
