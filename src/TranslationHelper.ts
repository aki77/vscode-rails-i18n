import type { Position, TextDocument } from 'vscode'
import type I18n from './i18n.js'
import { asAbsoluteKey } from './KeyDetector.js'
import type { Translation } from './Parser.js'
import { priorityOfLocales } from './utils.js'

export interface TranslationResult {
  key: string
  normalizedKey: string
  translation: Translation | undefined
}

export interface LocaleTranslationResult {
  locale: string
  translation: Translation | undefined
}

export interface MultiLanguageTranslationResult {
  key: string
  normalizedKey: string
  localeResults: LocaleTranslationResult[]
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

/**
 * Retrieves the translation information for the specified key across multiple locales.
 */
export function getMultiLanguageTranslationForKey(
  i18n: I18n,
  document: TextDocument,
  key: string
): MultiLanguageTranslationResult | undefined {
  const normalizedKey = asAbsoluteKey(key, document)
  if (!normalizedKey) {
    return undefined
  }

  const locales = priorityOfLocales()
  const localeResults: LocaleTranslationResult[] = locales.map((locale) => {
    const translation = i18n.getByLocale(normalizedKey, locale)
    return {
      locale,
      translation,
    }
  })

  return {
    key,
    normalizedKey,
    localeResults,
  }
}

/**
 * Retrieves the translation information for the key at the specified position across multiple locales.
 */
export function getMultiLanguageTranslationForPosition(
  i18n: I18n,
  document: TextDocument,
  position: Position
): MultiLanguageTranslationResult | undefined {
  const keyAndRange = i18n.getKeyAndRange(document, position)
  if (!keyAndRange) {
    return undefined
  }

  return getMultiLanguageTranslationForKey(i18n, document, keyAndRange.key)
}
