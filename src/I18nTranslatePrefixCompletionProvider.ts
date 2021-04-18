import * as path from "path";

import {
  workspace,
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  TextDocument,
  Range,
  Position
} from "vscode";
import escapeStringRegexp from "escape-string-regexp";
import I18n from "./i18n";

export default class I18nTranslatePrefixCompletionProvider
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

    return this.buildCompletinItems(document);
  }

  private buildCompletinItems(document: TextDocument) {
    const relativePath = workspace.asRelativePath(document.uri);
    const paths = [];
    paths.push(...path.dirname(relativePath).split(path.sep));
    paths.push(path.basename(relativePath).split(".", 2)[0]);
    paths.shift();

    return [paths.join("."), paths.slice(1).join(".")].map((key, index) => {
      const item = new CompletionItem(key, CompletionItemKind.Keyword);
      item.preselect = index === 0;
      item.sortText = index === 0 ? "0" : "1";
      return item;
    });
  }
}
