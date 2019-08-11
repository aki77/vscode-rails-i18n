import { TextDocument, Position, HoverProvider, Hover } from "vscode";
import I18n from "./i18n";

const escapeStringRegexp = require("escape-string-regexp");

export default class I18nHoverProvider implements HoverProvider {
  constructor(private i18n: I18n) {}

  public provideHover(document: TextDocument, position: Position) {
    const keyRange = this.getI18nKeyAndRange(document, position);
    if (!keyRange) {
      return null;
    }

    const { key, range } = keyRange;
    const value = this.i18n.get(key);
    if (!value) {
      return null;
    }

    return new Hover({ language: "text", value }, range);
  }

  private getI18nKeyAndRange(document: TextDocument, position: Position) {
    const methods = this.i18n.translateMethods().map(escapeStringRegexp);
    const i18nRegexp = new RegExp(
      `[^a-z.](?:${methods.join("|")})['"\\s(]+([a-zA-Z0-9_.]*)`
    );

    const range = document.getWordRangeAtPosition(position, i18nRegexp);
    if (!range) {
      return null;
    }

    const matched = document.getText(range).match(i18nRegexp);
    if (!matched) {
      return null;
    }

    return {
      range,
      key: matched[1]
    };
  }
}
