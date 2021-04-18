import * as vscode from "vscode";
import I18n from "./i18n";
import I18nTranslateCompletionProvider from "./I18nTranslateCompletionProvider";
import I18nTranslatePrefixCompletionProvider from "./I18nTranslatePrefixCompletionProvider";
import I18nLocalizeCompletionProvider from "./I18nLocalizeCompletionProvider";
import I18nHoverProvider from "./I18nHoverProvider";
import I18nCodeActionProvider from "./I18nCodeActionProvider";
import I18nDefinitionProvider from './I18nDefinitionProvider';

const SELECTOR = ["ruby", "erb", "haml", "slim"];

export async function activate(context: vscode.ExtensionContext) {
  const globPattern = vscode.workspace.getConfiguration("railsI18n")
    .localeFilePattern;
  const localePaths = await vscode.workspace.findFiles(globPattern);
  if (localePaths.length < 1) {
    return;
  }

  const i18n = new I18n(globPattern);
  i18n.load();

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      SELECTOR,
      new I18nTranslateCompletionProvider(i18n),
      "'",
      '"'
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      SELECTOR,
      new I18nTranslatePrefixCompletionProvider(i18n),
      "'",
      '"'
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      SELECTOR,
      new I18nLocalizeCompletionProvider(i18n),
      ":"
    )
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      SELECTOR,
      new I18nHoverProvider(i18n)
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      SELECTOR,
      new I18nCodeActionProvider(i18n)
    )
  );

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      SELECTOR,
      new I18nDefinitionProvider(i18n)
    )
  );
}

export function deactivate() {}
