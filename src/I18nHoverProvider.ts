import { TextDocument, Position, HoverProvider, Hover } from "vscode";
import I18n from "./i18n.js";
import KeyDetector from "./KeyDetector.js";

export default class I18nHoverProvider implements HoverProvider {
  constructor(private i18n: I18n) {}

  public provideHover(document: TextDocument, position: Position) {
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

    return new Hover({ language: "text", value: translation.value }, range);
  }
}
