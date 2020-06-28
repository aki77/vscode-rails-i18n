import {
  DefinitionProvider,
  TextDocument,
  Position,
  Uri,
  LocationLink
} from "vscode";
import I18n from './i18n';
import KeyDetector from './KeyDetector';

export default class I18nDefinitionProvider implements DefinitionProvider {
  constructor(private i18n: I18n) { }

  public async provideDefinition(document: TextDocument, position: Position): Promise<LocationLink[] | undefined> {
    const keyAndRange = this.i18n.getKeyAndRange(document, position);
    if (!keyAndRange) {
      return;
    }

    const { key, range } = keyAndRange;
    const normalizedKey = KeyDetector.asAbsoluteKey(key, document);
    if (!normalizedKey) {
      return;
    }

    const translation = this.i18n.get(normalizedKey);
    if (!translation) {
      return;
    }

    return [
      {
        originSelectionRange: range,
        targetUri: Uri.file(translation.path),
        targetRange: translation.range,
      }
    ];
  }
}
