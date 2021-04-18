import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  TextDocument,
  Range,
  Position
} from "vscode";
import escapeStringRegexp from "escape-string-regexp";
import I18n from "./i18n";

export default class I18nTranslateCompletionProvider
  implements CompletionItemProvider {
  constructor(private i18n: I18n) {}

  public provideCompletionItems(document: TextDocument, position: Position) {
    const methods = this.i18n.translateMethods().map(escapeStringRegexp);
    const lineRegexp = new RegExp(
      `[^a-z.](?:${methods.join("|")})['"\\s(]+([a-zA-Z0-9_.]*)$`
    );
    const line = document.getText(
      new Range(
        new Position(position.line, 0),
        new Position(position.line, position.character)
      )
    );
    const matches = line.match(lineRegexp);
    if (!matches) {
      return null;
    }

    const range =
      document.getWordRangeAtPosition(position, /[a-zA-Z0-9_.]+/) ||
      // NOTE: when trigger characters
      new Range(position, position);
    return this.buildCompletionItems(range);
  }

  private buildCompletionItems(range: Range) {
    return Array.from(this.i18n.entries()).map(([key, translation]) => {
      const item = new CompletionItem(key, CompletionItemKind.Keyword);
      item.documentation = translation.value;
      item.range = range;
      return item;
    });
  }
}
