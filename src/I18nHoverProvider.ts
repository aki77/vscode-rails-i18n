import {
  Hover,
  type HoverProvider,
  type Position,
  type TextDocument,
} from 'vscode'
import type I18n from './i18n.js'
import { asAbsoluteKey } from './KeyDetector.js'

export default class I18nHoverProvider implements HoverProvider {
  constructor(private i18n: I18n) {}

  public provideHover(document: TextDocument, position: Position) {
    const keyAndRange = this.i18n.getKeyAndRange(document, position)
    if (!keyAndRange) {
      return
    }

    const { key, range } = keyAndRange
    const normalizedKey = asAbsoluteKey(key, document)
    if (!normalizedKey) {
      return
    }

    const translation = this.i18n.get(normalizedKey)
    if (!translation) {
      return
    }

    return new Hover({ language: 'text', value: translation.value }, range)
  }
}
