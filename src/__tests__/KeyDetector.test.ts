import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { TextDocument } from 'vscode'

// Mock for VSCode API
vi.mock('vscode', () => ({
  Range: vi.fn((start: any, end: any) => ({ start, end })),
  Position: vi.fn((line: number, character: number) => ({ line, character })),
  workspace: {
    asRelativePath: vi.fn(),
  },
}))

// Import KeyDetector after mocking
let getAllI18nKeys: any

beforeAll(async () => {
  const module = await import('../KeyDetector.js')
  getAllI18nKeys = module.getAllI18nKeys
})

// Mock for TextDocument
function createMockDocument(text: string): TextDocument {
  return {
    getText: () => text,
    positionAt: (offset: number) => {
      const lines = text.substring(0, offset).split('\n')
      return {
        line: lines.length - 1,
        character: lines[lines.length - 1].length,
      }
    },
  } as TextDocument
}

describe('getAllI18nKeys', () => {
  const translateMethods = ['t', 'I18n.t', 'I18n.translate']

  it('detects valid I18n keys', async () => {
    const text = 't("user.name")'
    const document = createMockDocument(text)

    const result = await getAllI18nKeys(document, translateMethods)

    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('user.name')
  })

  it('detects multiple I18n keys', async () => {
    const text = `
      t("user.name")
      I18n.t("user.email")
      I18n.translate("user.address")
    `
    const document = createMockDocument(text)

    const result = await getAllI18nKeys(document, translateMethods)

    expect(result).toHaveLength(3)
    expect(result[0].key).toBe('user.name')
    expect(result[1].key).toBe('user.email')
    expect(result[2].key).toBe('user.address')
  })

  it('detects keys with mixed quote types', async () => {
    const text = `
      t('user.name')
      I18n.t("user.email")
    `
    const document = createMockDocument(text)

    const result = await getAllI18nKeys(document, translateMethods)

    expect(result).toHaveLength(2)
    expect(result[0].key).toBe('user.name')
    expect(result[1].key).toBe('user.email')
  })

  it('does not detect text in comments', async () => {
    const text = `
      # Don't add this
      // Don't add this either
      /* Don't add this too */
      t("user.name")
    `
    const document = createMockDocument(text)

    const result = await getAllI18nKeys(document, translateMethods)

    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('user.name')
  })

  it('does not detect text in string literals', async () => {
    const text = `
      puts "Don't add this"
      console.log("Don't add this either")
      t("user.name")
    `
    const document = createMockDocument(text)

    const result = await getAllI18nKeys(document, translateMethods)

    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('user.name')
  })

  it('does not detect when included as part of another word', async () => {
    const text = `
      custom_translate("not.detected")
      at("not.detected.either")
      t("user.name")
    `
    const document = createMockDocument(text)

    const result = await getAllI18nKeys(document, translateMethods)

    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('user.name')
  })

  it('supports various parentheses and space patterns', async () => {
    const text = `
      t( "user.name" )
      t("user.email")
      t('user.address')
    `
    const document = createMockDocument(text)

    const result = await getAllI18nKeys(document, translateMethods)

    expect(result).toHaveLength(3)
    expect(result[0].key).toBe('user.name')
    expect(result[1].key).toBe('user.email')
    expect(result[2].key).toBe('user.address')
  })

  it('does not detect comment-like strings such as "Don\'t add"', async () => {
    const text = `
      # Don't add this
      // Don't add this either
      puts "Don't add this string"
      t("user.name") # valid I18n key
    `
    const document = createMockDocument(text)

    const result = await getAllI18nKeys(document, translateMethods)

    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('user.name')
  })
})
