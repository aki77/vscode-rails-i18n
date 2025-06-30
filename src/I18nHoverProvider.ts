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
  getMultiLanguageLocalizeTranslationForPosition,
  getMultiLanguageTranslationForPosition,
  type LocaleTranslationResult,
  type MultiLanguageTranslationResult,
} from './TranslationHelper.js'
import { escapeForMarkdown, escapeHtml } from './utils.js'

export default class I18nHoverProvider implements HoverProvider {
  constructor(private i18n: I18n) {}

  public async provideHover(document: TextDocument, position: Position) {
    // First, try to get the translation for regular i18n keys
    const result = await getMultiLanguageTranslationForPosition(
      this.i18n,
      document,
      position
    )

    // Check if we found a regular i18n key with translations
    if (result) {
      const hasAnyTranslation = result.localeResults.some(
        (r) => r.translation !== undefined
      )
      if (hasAnyTranslation) {
        const keyAndRange = await this.i18n.getKeyAndRange(document, position)
        if (keyAndRange) {
          // Format multiple language translations
          const markdownContent = this.formatMultiLanguageTranslations(result)
          return new Hover(markdownContent, keyAndRange.range)
        }
      }
    }

    // If no regular i18n key found or no translations, try localize method
    const localizeResult = getMultiLanguageLocalizeTranslationForPosition(
      this.i18n,
      document,
      position
    )
    if (localizeResult) {
      const hasAnyTranslation = localizeResult.localeResults.some(
        (r) => r.translation !== undefined
      )
      if (hasAnyTranslation) {
        const markdownContent =
          this.formatMultiLanguageTranslations(localizeResult)
        return new Hover(markdownContent)
      }
    }

    return
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
