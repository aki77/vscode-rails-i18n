import { workspace } from "vscode";

export function priorityOfLocales(): string[] {
  return workspace.getConfiguration("railsI18n").priorityOfLocales as string[];
}

export function availableLocale(locale: string): boolean {
  return priorityOfLocales().includes(locale);
}
