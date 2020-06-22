import {
  DefinitionProvider,
  Range,
  TextDocument,
  Position,
  Uri,
  workspace,
  Location
} from "vscode";
import I18n from './i18n';
import KeyDetector from './KeyDetector';
import { parseDocument } from 'yaml';
import { Pair } from 'yaml/types';

export default class I18nDefinitionProvider implements DefinitionProvider {
  constructor(private i18n: I18n) { }

  public async provideDefinition(document: TextDocument, position: Position) {
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

    const absoluteKeys = KeyDetector.asAbsoluteKeys(translation.locale, normalizedKey, position, range);

    return this.getDefinitionLocation(translation.path, absoluteKeys);
  }

  private async getDefinitionLocation(path: string, absoluteKeys: string[]) {
    const targetUri = Uri.file(path);
    const localeText = await workspace.openTextDocument(targetUri);

    const contents = parseDocument(localeText.getText()).contents as any;
    if (!contents) {
      return;
    }

    const scalar = this.getScalar(contents, absoluteKeys);
    const pos = localeText.positionAt(scalar.key.range[0]);

    return new Location(targetUri, new Range(pos, pos));
  }

  private getScalar(contents: any, absoluteKeys: string[]) {
    const lastKey = absoluteKeys.pop();
    const rootScalar = contents.getIn(absoluteKeys);

    return rootScalar.items.find((pair: Pair) => pair.key.value === lastKey);
  }
}
