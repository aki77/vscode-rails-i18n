import type { Position, TextDocument } from 'vscode'
import type I18n from './i18n.js'
import { asAbsoluteKey, getLocalizeKeyAtPosition } from './KeyDetector.js'
import { getLocalizeFormatKey, type LocalizeType } from './LocalizeUtils.js'
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
export async function getTranslationForPosition(
  i18n: I18n,
  document: TextDocument,
  position: Position
): Promise<TranslationResult | undefined> {
  const keyAndRange = await i18n.getKeyAndRange(document, position)
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
export async function getMultiLanguageTranslationForPosition(
  i18n: I18n,
  document: TextDocument,
  position: Position
): Promise<MultiLanguageTranslationResult | undefined> {
  const keyAndRange = await i18n.getKeyAndRange(document, position)
  if (!keyAndRange) {
    return undefined
  }

  return getMultiLanguageTranslationForKey(i18n, document, keyAndRange.key)
}

/**
 * Retrieves the translation information for the localize method format key.
 */
export function getLocalizeTranslationForKey(
  i18n: I18n,
  formatKey: string,
  type?: LocalizeType
): TranslationResult | undefined {
  const possibleKeys = getLocalizeFormatKey(formatKey, type)

  // Try each possible key and return the first one that has a translation
  for (const key of possibleKeys) {
    const translation = i18n.get(key)
    if (translation) {
      return {
        key: formatKey, // Keep the original format key for display
        normalizedKey: key,
        translation,
      }
    }
  }

  // If no translation found, return the first possible key
  const firstKey = possibleKeys[0]
  return {
    key: formatKey,
    normalizedKey: firstKey,
    translation: undefined,
  }
}

/**
 * Retrieves the translation information for the localize method at the specified position.
 */
export function getLocalizeTranslationForPosition(
  i18n: I18n,
  document: TextDocument,
  position: Position
): TranslationResult | undefined {
  const localizeKeyInfo = getLocalizeKeyAtPosition(document, position)
  if (!localizeKeyInfo) {
    return undefined
  }

  // Try each possible key and return the first one that has a translation
  for (const key of localizeKeyInfo.keys) {
    const translation = i18n.get(key)
    if (translation) {
      return {
        key: localizeKeyInfo.methodInfo.formatKey, // Keep the original format key for display
        normalizedKey: key,
        translation,
      }
    }
  }

  // If no translation found, return the first possible key
  const firstKey = localizeKeyInfo.keys[0]
  return {
    key: localizeKeyInfo.methodInfo.formatKey,
    normalizedKey: firstKey,
    translation: undefined,
  }
}
