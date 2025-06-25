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
  type LocaleTranslationResult,
  type MultiLanguageTranslationResult,
} from './TranslationHelper.js'
import { escapeForMarkdown, escapeHtml } from './utils.js'

export default class I18nHoverProvider implements HoverProvider {
  constructor(private i18n: I18n) {}

  public async provideHover(document: TextDocument, position: Position) {
    const result = await getMultiLanguageTranslationForPosition(
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

    const keyAndRange = await this.i18n.getKeyAndRange(document, position)
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
    const markdown = new MarkdownString(tableContent, true)
    markdown.supportHtml = false
    markdown.isTrusted = true

    return markdown
  }

  private createTranslationTable(
    localeResults: LocaleTranslationResult[]
  ): string {
    if (localeResults.length === 0) {
      return ''
    }

    const rows: string[] = []

    for (const localeResult of localeResults) {
      const locale = escapeForMarkdown(localeResult.locale)
      let translation: string
      let jumpIcon = ''

      if (localeResult.translation) {
        const value = localeResult.translation.value
        const truncatedValue =
          value.length > 100 ? `${value.substring(0, 100)}...` : value
        translation = escapeForMarkdown(truncatedValue)

        // Create command URI for jumping to translation file
        const commandArgs = {
          locale: localeResult.locale,
          key: 'translation', // This could be the actual key if needed
          path: localeResult.translation.path,
          range: {
            start: {
              line: localeResult.translation.range.start.line,
              character: localeResult.translation.range.start.character,
            },
            end: {
              line: localeResult.translation.range.end.line,
              character: localeResult.translation.range.end.character,
            },
          },
        }
        const encodedArgs = encodeURIComponent(JSON.stringify(commandArgs))
        jumpIcon = `[$(go-to-file)](command:railsI18n.gotoTranslationByLocale?${encodedArgs} "Jump to translation")`
      } else {
        translation = MISSING_TRANSLATION_TEXT
      }

      rows.push(`| ${jumpIcon} | ${locale} | | ${escapeHtml(translation)} | |`)
    }

    // Updated table structure with icon column and empty columns between
    return `| | | | | |\n|---|---:|---|---|---|\n${rows.join('\n')}\n| | | | | |`
  }
}
