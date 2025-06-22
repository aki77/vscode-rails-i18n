import {
  TextDocument,
  Range,
  CodeActionProvider,
  CodeAction,
  CodeActionKind,
  WorkspaceEdit
} from "vscode";
import I18n from "./i18n.js";
import KeyDetector from "./KeyDetector.js";

export default class I18nCodeActionProvider implements CodeActionProvider {
  constructor(private i18n: I18n) {}

  public provideCodeActions(document: TextDocument, _range: Range) {
    const keyAndRange = this.i18n.getKeyAndRange(document, _range.start);
    if (!keyAndRange) {
      return;
    }

    const { key, range } = keyAndRange;
    const actions: CodeAction[] = [];

    if (KeyDetector.isLazyLookupKey(key)) {
      const absoluteKey = KeyDetector.asAbsoluteKey(key, document);
      if (absoluteKey) {
        actions.push(
          this.buildAsAbsoluteKeyAction(absoluteKey, document, range)
        );
      }
    }

    return actions;
  }

  private buildAsAbsoluteKeyAction(
    absoluteKey: string,
    document: TextDocument,
    range: Range
  ) {
    const edit = new WorkspaceEdit();
    edit.replace(document.uri, range, absoluteKey);

    const action = new CodeAction(
      "Convert absolute key",
      CodeActionKind.Refactor
    );
    action.edit = edit;

    return action;
  }
}
