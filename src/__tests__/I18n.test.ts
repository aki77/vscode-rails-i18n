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

      expect(result).toHaveProperty('merged')
      expect(result).toHaveProperty('byLocale')
      expect(result.byLocale).toBeInstanceOf(Map)
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
    it('should maintain existing get() method behavior', () => {
      const i18n = new I18n('config/locales/*.yml')

      // Set up test data in the original translations map
      const mockTranslation = {
        locale: 'en',
        path: '/en.yml',
        value: 'Name',
        range: new Range({} as any, {} as any),
      }

      ;(i18n as any).translations.set('user.name', mockTranslation)

      const result = i18n.get('user.name')
      expect(result).toEqual(mockTranslation)
    })

    it('should maintain existing entries() method behavior', () => {
      const i18n = new I18n('config/locales/*.yml')

      // Set up test data
      const mockTranslation = {
        locale: 'en',
        path: '/en.yml',
        value: 'Name',
        range: new Range({} as any, {} as any),
      }

      ;(i18n as any).translations.set('user.name', mockTranslation)

      const entries = Array.from(i18n.entries())
      expect(entries).toHaveLength(1)
      expect(entries[0]).toEqual(['user.name', mockTranslation])
    })
  })

  describe('Memory Management', () => {
    it('should clear both translation maps on dispose', () => {
      const i18n = new I18n('config/locales/*.yml')

      // Set up test data
      ;(i18n as any).translations.set('test', {})
      ;(i18n as any).localeTranslations.set('en', new Map())

      expect((i18n as any).translations.size).toBe(1)
      expect((i18n as any).localeTranslations.size).toBe(1)

      i18n.dispose()

      expect((i18n as any).translations.size).toBe(0)
      expect((i18n as any).localeTranslations.size).toBe(0)
    })
  })
})
