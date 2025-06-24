import { workspace } from 'vscode'

export function priorityOfLocales(): string[] {
  return workspace.getConfiguration('railsI18n').priorityOfLocales as string[]
}

export function availableLocale(locale: string): boolean {
  return priorityOfLocales().includes(locale)
}

export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
    .replace(/~/g, '&#126;')
    .replace(/\|/g, '&#124;')
    .replace(/\*/g, '&#42;')
    .replace(/_/g, '&#95;')
    .replace(/\\/g, '&#92;')
    .replace(/\s+/g, ' ')
}

export const escapeForMarkdown = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/~/g, '\\~')
}
