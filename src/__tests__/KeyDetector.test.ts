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
let getHumanAttributeNameKeys: any
let getHumanAttributeNameKeyAtPosition: any

beforeAll(async () => {
  const module = await import('../KeyDetector.js')
  getAllI18nKeys = module.getAllI18nKeys
  getHumanAttributeNameKeys = module.getHumanAttributeNameKeys
  getHumanAttributeNameKeyAtPosition = module.getHumanAttributeNameKeyAtPosition
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
    offsetAt: (position: any) => {
      const lines = text.split('\n')
      let offset = 0
      for (let i = 0; i < position.line; i++) {
        offset += lines[i].length + 1 // +1 for newline character
      }
      offset += position.character
      return offset
    },
    lineAt: (line: number) => {
      const lines = text.split('\n')
      const lineText = lines[line] || ''
      return {
        range: {
          start: { line, character: 0 },
          end: { line, character: lineText.length },
        },
        text: lineText,
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

describe('getHumanAttributeNameKeys', () => {
  it('detects Model.human_attribute_name :attr pattern', async () => {
    const text = 'User.human_attribute_name :name'
    const document = createMockDocument(text)

    const result = await getHumanAttributeNameKeys(document)

    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('activerecord.attributes.user.name')
    expect(result[0].originalText).toBe('User.human_attribute_name :name')
  })

  it('detects Model.human_attribute_name(:attr) pattern', async () => {
    const text = 'User.human_attribute_name(:email)'
    const document = createMockDocument(text)

    const result = await getHumanAttributeNameKeys(document)

    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('activerecord.attributes.user.email')
    expect(result[0].originalText).toBe('User.human_attribute_name(:email)')
  })

  it('detects multiple human_attribute_name calls', async () => {
    const text = `
      User.human_attribute_name :name
      User.human_attribute_name :email
      Product.human_attribute_name(:title)
    `
    const document = createMockDocument(text)

    const result = await getHumanAttributeNameKeys(document)

    expect(result).toHaveLength(3)
    expect(result[0].key).toBe('activerecord.attributes.user.name')
    expect(result[1].key).toBe('activerecord.attributes.user.email')
    expect(result[2].key).toBe('activerecord.attributes.product.title')
  })

  it('handles spaces in method call patterns', async () => {
    const text = `
      Product.human_attribute_name   :description
      User.human_attribute_name( :name )
    `
    const document = createMockDocument(text)

    const result = await getHumanAttributeNameKeys(document)

    expect(result).toHaveLength(2)
    expect(result[0].key).toBe('activerecord.attributes.product.description')
    expect(result[1].key).toBe('activerecord.attributes.user.name')
  })

  it('pluralizes model names correctly', async () => {
    const text = `
      User.human_attribute_name :name
      Category.human_attribute_name :title
      Child.human_attribute_name :age
    `
    const document = createMockDocument(text)

    const result = await getHumanAttributeNameKeys(document)

    expect(result).toHaveLength(3)
    expect(result[0].key).toBe('activerecord.attributes.user.name')
    expect(result[1].key).toBe('activerecord.attributes.category.title')
    expect(result[2].key).toBe('activerecord.attributes.child.age')
  })

  it('handles underscore in model names', async () => {
    const text = 'UserProfile.human_attribute_name :bio'
    const document = createMockDocument(text)

    const result = await getHumanAttributeNameKeys(document)

    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('activerecord.attributes.user_profile.bio')
  })

  it('returns empty array when no matches found', async () => {
    const text = 'some_other_method(:attr)'
    const document = createMockDocument(text)

    const result = await getHumanAttributeNameKeys(document)

    expect(result).toHaveLength(0)
  })
})

describe('getHumanAttributeNameKeyAtPosition', () => {
  it('detects Model.human_attribute_name :attr pattern at position', () => {
    const text = 'User.human_attribute_name :name'
    const document = createMockDocument(text)
    const position = { line: 0, character: 28 } // Position on 'name'

    const result = getHumanAttributeNameKeyAtPosition(document, position)

    expect(result).toBeDefined()
    expect(result?.key).toBe('activerecord.attributes.user.name')
    expect(result?.originalText).toBe('User.human_attribute_name :name')
  })

  it('detects Model.human_attribute_name(:attr) pattern at position', () => {
    const text = 'User.human_attribute_name(:email)'
    const document = createMockDocument(text)
    const position = { line: 0, character: 29 } // Position on 'email'

    const result = getHumanAttributeNameKeyAtPosition(document, position)

    expect(result).toBeDefined()
    expect(result?.key).toBe('activerecord.attributes.user.email')
    expect(result?.originalText).toBe('User.human_attribute_name(:email)')
  })

  it('returns null when position is not within human_attribute_name pattern', () => {
    const text = 'User.human_attribute_name :name and some other text'
    const document = createMockDocument(text)
    const position = { line: 0, character: 40 } // Position outside the pattern

    const result = getHumanAttributeNameKeyAtPosition(document, position)

    expect(result).toBeUndefined()
  })

  it('returns null when no human_attribute_name pattern exists', () => {
    const text = 'some_other_method(:attr)'
    const document = createMockDocument(text)
    const position = { line: 0, character: 10 }

    const result = getHumanAttributeNameKeyAtPosition(document, position)

    expect(result).toBeUndefined()
  })

  it('handles position at the beginning of attribute name', () => {
    const text = 'Product.human_attribute_name :description'
    const document = createMockDocument(text)
    const position = { line: 0, character: 30 } // Position at start of 'description'

    const result = getHumanAttributeNameKeyAtPosition(document, position)

    expect(result).toBeDefined()
    expect(result?.key).toBe('activerecord.attributes.product.description')
  })
})
