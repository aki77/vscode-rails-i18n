import {
  Hover,
  type HoverProvider,
  type Position,
  type TextDocument,
} from 'vscode'
import type I18n from './i18n.js'
import { getTranslationForPosition } from './TranslationHelper.js'

export default class I18nHoverProvider implements HoverProvider {
  constructor(private i18n: I18n) {}

  public provideHover(document: TextDocument, position: Position) {
    const result = getTranslationForPosition(this.i18n, document, position)
    if (!result?.found || !result.translation) {
      return
    }

    const keyAndRange = this.i18n.getKeyAndRange(document, position)
    if (!keyAndRange) {
      return
    }

    return new Hover(
      { language: 'text', value: result.translation.value },
      keyAndRange.range
    )
  }
}
