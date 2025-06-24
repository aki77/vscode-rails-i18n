import {
  Hover,
  type HoverProvider,
  MarkdownString,
  type Position,
  type TextDocument,
} from 'vscode'
import { MISSING_TRANSLATION_TEXT } from './constants.js'
import type I18n from './i18n.js'
import {
  getMultiLanguageTranslationForPosition,
  type MultiLanguageTranslationResult,
} from './TranslationHelper.js'
import { escapeForMarkdown, escapeHtml } from './utils.js'

export default class I18nHoverProvider implements HoverProvider {
  constructor(private i18n: I18n) {}

  public provideHover(document: TextDocument, position: Position) {
    const result = getMultiLanguageTranslationForPosition(
      this.i18n,
      document,
      position
    )
    if (!result) {
      return
    }

    // Check if any translation exists
    const hasAnyTranslation = result.localeResults.some(
      (r) => r.translation !== undefined
    )
    if (!hasAnyTranslation) {
      return
    }

    const keyAndRange = this.i18n.getKeyAndRange(document, position)
    if (!keyAndRange) {
      return
    }

    // Format multiple language translations
    const markdownContent = this.formatMultiLanguageTranslations(result)

    return new Hover(markdownContent, keyAndRange.range)
  }

  private formatMultiLanguageTranslations(
    result: MultiLanguageTranslationResult
  ): MarkdownString {
    const tableContent = this.createTranslationTable(result.localeResults)
    const markdown = new MarkdownString(tableContent)
    markdown.supportHtml = false
    markdown.isTrusted = false

    return markdown
  }

  private createTranslationTable(
    localeResults: Array<{ locale: string; translation?: { value: string } }>
  ): string {
    const rows: string[] = []

    for (const localeResult of localeResults) {
      const locale = escapeForMarkdown(localeResult.locale)
      let translation: string

      if (localeResult.translation) {
        const value = localeResult.translation.value
        const truncatedValue =
          value.length > 100 ? `${value.substring(0, 100)}...` : value
        translation = escapeForMarkdown(truncatedValue)
      } else {
        translation = MISSING_TRANSLATION_TEXT
      }

      rows.push(`| | ${locale} | | ${escapeHtml(translation)} | | `)
    }

    // return rows.join('\n')
    return `| | | | |\n|---|---:|---|---|\n${rows.join('\n')}\n| | | | |`
  }
}
