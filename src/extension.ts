import * as vscode from 'vscode';
import I18n from './i18n.js';
import I18nTranslateCompletionProvider from './I18nTranslateCompletionProvider.js';
import I18nTranslatePrefixCompletionProvider from './I18nTranslatePrefixCompletionProvider.js';
import I18nLocalizeCompletionProvider from './I18nLocalizeCompletionProvider.js';
import I18nHoverProvider from './I18nHoverProvider.js';
import I18nCodeActionProvider from './I18nCodeActionProvider.js';
import I18nDefinitionProvider from './I18nDefinitionProvider.js';
import { commands } from 'vscode';
import { Translation } from './Parser.js';

const DEFAULT_SELECTOR = ['ruby', 'erb', 'haml', 'slim'];

const goto = async (i18n: I18n) => {
  const items: Array<
    vscode.QuickPickItem & { translation: Translation }
  > = Array.from(i18n.entries()).map(([key, translation]) => {
    return {
      label: key,
      detail: translation.value,
      translation,
    };
  });

  const selectedItem = await vscode.window.showQuickPick(items, {
    matchOnDetail: true,
  });
  if (!selectedItem) {
    return;
  }

  await vscode.window.showTextDocument(
    vscode.Uri.file(selectedItem.translation.path),
    { selection: selectedItem.translation.range }
  );
};

export async function activate(context: vscode.ExtensionContext) {
  const globPattern = vscode.workspace.getConfiguration('railsI18n')
    .localeFilePattern;
  const localePaths = await vscode.workspace.findFiles(globPattern);
  if (localePaths.length < 1) {
    return;
  }

  const i18n = new I18n(globPattern);
  i18n.load();

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      DEFAULT_SELECTOR,
      new I18nTranslateCompletionProvider(i18n),
      "'",
      '"'
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      DEFAULT_SELECTOR,
      new I18nTranslatePrefixCompletionProvider(i18n),
      "'",
      '"'
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      DEFAULT_SELECTOR,
      new I18nLocalizeCompletionProvider(i18n),
      ':'
    )
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      vscode.workspace.getConfiguration('railsI18n').languagesEnableHoverProvider ?? DEFAULT_SELECTOR,
      new I18nHoverProvider(i18n)
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      DEFAULT_SELECTOR,
      new I18nCodeActionProvider(i18n)
    )
  );

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      DEFAULT_SELECTOR,
      new I18nDefinitionProvider(i18n)
    )
  );

  context.subscriptions.push(
    commands.registerCommand('railsI18n.reload', () => {
      i18n.load();
    })
  );
  context.subscriptions.push(
    commands.registerCommand('railsI18n.gotoTranslation', () => {
      goto(i18n);
    })
  );

  return { i18n };
}

export function deactivate() {}
