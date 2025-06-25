import { describe, expect, it, vi, beforeEach } from 'vitest'
import { workspace } from 'vscode'
import { readFile } from 'node:fs'

// Mock for VSCode API
vi.mock('vscode', () => ({
  Range: vi.fn((start: any, end: any) => ({ start, end })),
  workspace: {
    openTextDocument: vi.fn(),
  },
}))

// Mock for node:fs
vi.mock('node:fs', () => ({
  readFile: vi.fn(),
}))

// Mock for utils
vi.mock('../utils.js', () => ({
  availableLocale: vi.fn(() => true),
}))

describe('Parser', () => {
  let Parser: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Mock workspace.openTextDocument
    vi.mocked(workspace.openTextDocument).mockResolvedValue({
      positionAt: vi.fn().mockReturnValue({ line: 0, character: 0 }),
    } as any)

    // Import Parser after mocking
    const parserModule = await import('../Parser.js')
    Parser = parserModule.Parser
  })

  describe('Symbol format YAML support', () => {
    it('should parse YAML with full symbol format', async () => {
      // Setup YAML with symbol format
      const symbolFormatYaml = `---
:en:
  :users:
    :title: "User Management"
  :common:
    :buttons:
      :save: "Save"`

      vi.mocked(readFile).mockImplementation((_path: any, callback: any) => {
        callback(null, Buffer.from(symbolFormatYaml))
      })

      const parser = new Parser('/test.yml')
      const result = await parser.parse()

      expect(result).toHaveLength(1)
      expect(result[0][0]).toBe('en')
      
      const translations = result[0][1]
      expect(translations['users.title']).toBeDefined()
      expect(translations['users.title'].value).toBe('User Management')
      expect(translations['users.title'].locale).toBe('en')
      expect(translations['common.buttons.save']).toBeDefined()
      expect(translations['common.buttons.save'].value).toBe('Save')
      expect(translations['common.buttons.save'].locale).toBe('en')
    })

    it('should parse YAML with mixed symbol and regular format', async () => {
      // Setup YAML with mixed format
      const mixedFormatYaml = `---
:en:
  :navigation:
    :home: "Home"
  regular_key:
    nested: "Regular Format"`

      vi.mocked(readFile).mockImplementation((_path: any, callback: any) => {
        callback(null, Buffer.from(mixedFormatYaml))
      })

      const parser = new Parser('/test.yml')
      const result = await parser.parse()

      expect(result).toHaveLength(1)
      expect(result[0][0]).toBe('en')
      
      const translations = result[0][1]
      expect(translations['navigation.home']).toBeDefined()
      expect(translations['navigation.home'].value).toBe('Home')
      expect(translations['regular_key.nested']).toBeDefined()
      expect(translations['regular_key.nested'].value).toBe('Regular Format')
    })

    it('should handle nested symbol format structures', async () => {
      // Setup deeply nested symbol format YAML
      const nestedSymbolYaml = `---
:ja:
  :errors:
    :models:
      :user:
        :attributes:
          :name:
            :blank: "名前を入力してください"`

      vi.mocked(readFile).mockImplementation((_path: any, callback: any) => {
        callback(null, Buffer.from(nestedSymbolYaml))
      })

      const parser = new Parser('/test.yml')
      const result = await parser.parse()

      expect(result).toHaveLength(1)
      expect(result[0][0]).toBe('ja')
      
      const translations = result[0][1]
      expect(translations['errors.models.user.attributes.name.blank']).toBeDefined()
      expect(translations['errors.models.user.attributes.name.blank'].value).toBe('名前を入力してください')
      expect(translations['errors.models.user.attributes.name.blank'].locale).toBe('ja')
    })

    it('should handle multiple symbol format locales', async () => {
      // Setup YAML with multiple symbol format locales
      const multiLocaleYaml = `---
:en:
  :common:
    :save: "Save"
:ja:
  :common:
    :save: "保存"`

      vi.mocked(readFile).mockImplementation((_path: any, callback: any) => {
        callback(null, Buffer.from(multiLocaleYaml))
      })

      const parser = new Parser('/test.yml')
      const result = await parser.parse()

      expect(result).toHaveLength(2)
      
      const enResult = result.find(([locale]: [string, any]) => locale === 'en')
      expect(enResult).toBeDefined()
      expect(enResult?.[1]['common.save'].value).toBe('Save')
      
      const jaResult = result.find(([locale]: [string, any]) => locale === 'ja')
      expect(jaResult).toBeDefined()
      expect(jaResult?.[1]['common.save'].value).toBe('保存')
    })
  })

  describe('Regular format YAML', () => {
    it('should parse regular format YAML', async () => {
      const regularFormatYaml = `---
en:
  users:
    title: "User Management"
  common:
    buttons:
      save: "Save"`

      vi.mocked(readFile).mockImplementation((_path: any, callback: any) => {
        callback(null, Buffer.from(regularFormatYaml))
      })

      const parser = new Parser('/test.yml')
      const result = await parser.parse()

      expect(result).toHaveLength(1)
      expect(result[0][0]).toBe('en')
      
      const translations = result[0][1]
      expect(translations['users.title'].value).toBe('User Management')
      expect(translations['common.buttons.save'].value).toBe('Save')
    })
  })
})