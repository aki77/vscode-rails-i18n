import {
  CompletionItem,
  CompletionItemKind,
  type CompletionItemProvider,
  Position,
  Range,
  type TextDocument,
} from 'vscode'
import type I18n from './i18n.js'
import { type LocalizeType, typeOfMethodName } from './LocalizeUtils.js'
import { createRegexFromPattern, REGEX_PATTERNS } from './RegexUtils.js'

export default class I18nLocalizeCompletionProvider
  implements CompletionItemProvider
{
  constructor(private i18n: I18n) {}

  public provideCompletionItems(document: TextDocument, position: Position) {
    const lineRegexp = createRegexFromPattern(
      this.i18n.localizeMethods(),
      REGEX_PATTERNS.LOCALIZE_COMPLETION
    )
    const line = document.getText(
      new Range(
        new Position(position.line, 0),
        new Position(position.line, position.character)
      )
    )
    const matches = line.match(lineRegexp)
    if (!matches) {
      return null
    }

    const methodType = typeOfMethodName(matches[1])
    return this.buildCompletionItems(methodType)
  }

  private buildCompletionItems(methodType?: LocalizeType) {
    return Array.from(this.i18n.entries())
      .filter(([key]) => {
        if (methodType) {
          return key.startsWith(`${methodType}.formats.`)
        }

        return (
          key.startsWith('date.formats.') || key.startsWith('time.formats.')
        )
      })
      .map(([key, translation]) => {
        const [type, , format] = key.split('.')
        const item = new CompletionItem(format, CompletionItemKind.Keyword)
        item.detail = type
        item.documentation = translation.value
        item.sortText = '0'
        return item
      })
  }
}
