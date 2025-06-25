import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Range, type Uri, workspace } from 'vscode'

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
vi.mock('../utils.js', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    priorityOfLocales: vi.fn(() => ['en', 'ja']),
    availableLocale: vi.fn(() => true),
  }
})

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

  describe('getKeyAndRange', () => {
    it('should detect regular i18n keys', async () => {
      const i18n = new I18n('config/locales/*.yml')

      const mockDocument = {
        getText: vi.fn().mockImplementation((range?: any) => {
          if (range) {
            // When called with a range, return the text within that range
            const fullText = 't("user.name")'
            const start = range.start.character
            const end = range.end.character
            return fullText.substring(start, end)
          }
          // When called without arguments, return the full text
          return 't("user.name")'
        }),
        positionAt: vi.fn().mockImplementation((offset: number) => {
          const line = 0
          const character = offset
          return { line, character }
        }),
        offsetAt: vi.fn().mockImplementation((position: any) => {
          return position.character
        }),
        lineAt: vi.fn().mockImplementation((lineNumber: number) => ({
          range: {
            start: { line: lineNumber, character: 0 },
            end: { line: lineNumber, character: 100 },
          },
          text: 't("user.name")',
        })),
        getWordRangeAtPosition: vi.fn().mockReturnValue({
          start: { line: 0, character: 3 },
          end: { line: 0, character: 12 },
        }),
      }

      // Mock isKeyByPosition to return true for regular keys
      ;(i18n as any).isKeyByPosition = vi.fn().mockReturnValue(true)

      const position = { line: 0, character: 7 }

      const result = await i18n.getKeyAndRange(mockDocument as any, position)

      expect(result).toBeDefined()
      expect(result?.key).toBe('user.name')
    })

    it('should detect human_attribute_name patterns', async () => {
      const i18n = new I18n('config/locales/*.yml')

      const mockDocument = {
        getText: vi.fn().mockReturnValue('User.human_attribute_name :name'),
        positionAt: vi.fn().mockImplementation((offset: number) => {
          const text = 'User.human_attribute_name :name'
          const lines = text.substring(0, offset).split('\n')
          return {
            line: lines.length - 1,
            character: lines[lines.length - 1].length,
          }
        }),
        offsetAt: vi.fn().mockImplementation((position: any) => {
          const text = 'User.human_attribute_name :name'
          const lines = text.split('\n')
          let offset = 0
          for (let i = 0; i < position.line; i++) {
            offset += lines[i].length + 1
          }
          offset += position.character
          return offset
        }),
        lineAt: vi.fn().mockImplementation((lineNumber: number) => ({
          range: {
            start: { line: lineNumber, character: 0 },
            end: { line: lineNumber, character: 100 },
          },
          text: 'User.human_attribute_name :name',
        })),
        getWordRangeAtPosition: vi.fn().mockReturnValue(null), // No regular match
      }

      const position = { line: 0, character: 27 } // Position on 'name'

      const result = await i18n.getKeyAndRange(mockDocument as any, position)

      expect(result).toBeDefined()
      expect(result?.key).toBe('activerecord.attributes.user.name')
    })

    it('should prioritize human_attribute_name over regular patterns', async () => {
      const i18n = new I18n('config/locales/*.yml')

      const mockDocument = {
        getText: vi.fn().mockReturnValue('User.human_attribute_name(:name)'),
        positionAt: vi.fn().mockImplementation((offset: number) => {
          const text = 'User.human_attribute_name(:name)'
          const lines = text.substring(0, offset).split('\n')
          return {
            line: lines.length - 1,
            character: lines[lines.length - 1].length,
          }
        }),
        offsetAt: vi.fn().mockImplementation((position: any) => {
          const text = 'User.human_attribute_name(:name)'
          const lines = text.split('\n')
          let offset = 0
          for (let i = 0; i < position.line; i++) {
            offset += lines[i].length + 1
          }
          offset += position.character
          return offset
        }),
        lineAt: vi.fn().mockImplementation((lineNumber: number) => ({
          range: {
            start: { line: lineNumber, character: 0 },
            end: { line: lineNumber, character: 100 },
          },
          text: 'User.human_attribute_name(:name)',
        })),
        getWordRangeAtPosition: vi.fn().mockReturnValue({
          start: { line: 0, character: 26 },
          end: { line: 0, character: 30 },
        }),
      }

      const position = { line: 0, character: 28 } // Position on 'name'

      const result = await i18n.getKeyAndRange(mockDocument as any, position)

      expect(result).toBeDefined()
      expect(result?.key).toBe('activerecord.attributes.user.name')
      // Should use human_attribute_name key, not the regular pattern
    })

    it('should return undefined when no pattern matches', async () => {
      const i18n = new I18n('config/locales/*.yml')

      const mockDocument = {
        getText: vi.fn().mockReturnValue('some_other_code'),
        positionAt: vi.fn(),
        offsetAt: vi.fn().mockImplementation((position: any) => {
          return position.character
        }),
        lineAt: vi.fn().mockImplementation((lineNumber: number) => ({
          range: {
            start: { line: lineNumber, character: 0 },
            end: { line: lineNumber, character: 100 },
          },
          text: 'some_other_code',
        })),
        getWordRangeAtPosition: vi.fn().mockReturnValue(null),
      }

      const position = { line: 0, character: 5 }

      const result = await i18n.getKeyAndRange(mockDocument as any, position)

      expect(result).toBeUndefined()
    })
  })
})
