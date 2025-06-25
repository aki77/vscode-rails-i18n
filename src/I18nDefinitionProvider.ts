import {
  type DefinitionProvider,
  type LocationLink,
  type Position,
  type TextDocument,
  Uri,
} from 'vscode'
import type I18n from './i18n.js'
import { asAbsoluteKey } from './KeyDetector.js'

export default class I18nDefinitionProvider implements DefinitionProvider {
  constructor(private i18n: I18n) {}

  public async provideDefinition(
    document: TextDocument,
    position: Position
  ): Promise<LocationLink[] | undefined> {
    const keyAndRange = await this.i18n.getKeyAndRange(document, position)
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

    return [
      {
        originSelectionRange: range,
        targetUri: Uri.file(translation.path),
        targetRange: translation.range,
      },
    ]
  }
}
