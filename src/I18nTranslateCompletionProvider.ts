import {
  CompletionItem,
  CompletionItemKind,
  type CompletionItemProvider,
  Position,
  Range,
  type TextDocument,
} from 'vscode'
import type I18n from './i18n.js'
import { createRegexFromPattern, REGEX_PATTERNS } from './RegexUtils.js'

export default class I18nTranslateCompletionProvider
  implements CompletionItemProvider
{
  constructor(private i18n: I18n) {}

  public provideCompletionItems(document: TextDocument, position: Position) {
    const lineRegexp = createRegexFromPattern(
      this.i18n.translateMethods(),
      REGEX_PATTERNS.TRANSLATE_COMPLETION
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

    const range =
      document.getWordRangeAtPosition(position, /[a-zA-Z0-9_.]+/) ||
      // NOTE: when trigger characters
      new Range(position, position)
    return this.buildCompletionItems(range)
  }

  private buildCompletionItems(range: Range) {
    return Array.from(this.i18n.entries()).map(([key, translation]) => {
      const item = new CompletionItem(key, CompletionItemKind.Keyword)
      item.documentation = translation.value
      item.range = range
      return item
    })
  }
}
