import * as path from 'node:path'

import {
  CompletionItem,
  CompletionItemKind,
  type CompletionItemProvider,
  Position,
  Range,
  type TextDocument,
  workspace,
} from 'vscode'
import type I18n from './i18n.js'
import { createRegexFromPattern, REGEX_PATTERNS } from './RegexUtils.js'

export default class I18nTranslatePrefixCompletionProvider
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

    return this.buildCompletionItems(document)
  }

  private buildCompletionItems(document: TextDocument) {
    const relativePath = workspace.asRelativePath(document.uri)
    const paths = []
    paths.push(...path.dirname(relativePath).split(path.sep))
    paths.push(path.basename(relativePath).split('.', 2)[0])
    paths.shift()

    return [paths.join('.'), paths.slice(1).join('.')].map((key, index) => {
      const item = new CompletionItem(key, CompletionItemKind.Keyword)
      item.preselect = index === 0
      item.sortText = index === 0 ? '0' : '1'
      return item
    })
  }
}
