import type { Position, TextDocument } from 'vscode'
import type I18n from './i18n.js'
import { asAbsoluteKey } from './KeyDetector.js'
import type { Translation } from './Parser.js'

export interface TranslationResult {
  key: string
  normalizedKey: string
  translation: Translation | undefined
  found: boolean
}

/**
 * Retrieves the translation information for the specified key.
 */
export function getTranslationForKey(
  i18n: I18n,
  document: TextDocument,
  key: string
): TranslationResult | undefined {
  const normalizedKey = asAbsoluteKey(key, document)
  if (!normalizedKey) {
    return undefined
  }

  const translation = i18n.get(normalizedKey)

  return {
    key,
    normalizedKey,
    translation,
    found: !!translation,
  }
}

/**
 * Retrieves the translation information for the key at the specified position.
 */
export function getTranslationForPosition(
  i18n: I18n,
  document: TextDocument,
  position: Position
): TranslationResult | undefined {
  const keyAndRange = i18n.getKeyAndRange(document, position)
  if (!keyAndRange) {
    return undefined
  }

  return getTranslationForKey(i18n, document, keyAndRange.key)
}
