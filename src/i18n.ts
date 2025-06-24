import { sortBy } from '@std/collections'
import debounce from 'debounce'
import escapeStringRegexp from 'escape-string-regexp'
import * as vscode from 'vscode'
import {
  type FileSystemWatcher,
  type Position,
  type Range,
  RelativePattern,
  type TextDocument,
  type WorkspaceFolder,
} from 'vscode'
import { Parser, type Translation } from './Parser.js'
import { priorityOfLocales } from './utils.js'

const KEY_REGEXP = /[a-zA-Z0-9_.]+/

export default class I18n {
  private translations: Map<string, Translation> = new Map()
  private localeTranslations: Map<string, Map<string, Translation>> = new Map()
  private fileWatchers: FileSystemWatcher[]

  constructor(private globPattern: string) {
    this.fileWatchers = this.createFileWatchers()
  }

  public dispose() {
    this.translations.clear()
    this.localeTranslations.clear()
    this.fileWatchers.map((fileWatcher) => {
      fileWatcher.dispose()
    })
  }

  public get(key: string) {
    return this.translations.get(key)
  }

  public entries() {
    return this.translations.entries()
  }

  public getByLocale(key: string, locale: string): Translation | undefined {
    const localeMap = this.localeTranslations.get(locale)
    return localeMap?.get(key)
  }

  public getAvailableLocales(): string[] {
    return Array.from(this.localeTranslations.keys())
  }

  public load() {
    const progressOptions = {
      location: vscode.ProgressLocation.Window,
      title: 'Loading rails I18n',
    }

    vscode.window.withProgress(progressOptions, async () => {
      this.translations.clear()
      this.localeTranslations.clear()
      const result = await this.parse()
      this.translations = new Map(Object.entries(result.merged))
      this.localeTranslations = result.byLocale
    })
  }

  public translateMethods(): string[] {
    return vscode.workspace.getConfiguration('railsI18n').translateMethods
  }

  public localizeMethods(): string[] {
    return vscode.workspace.getConfiguration('railsI18n').localizeMethods
  }

  public getKeyByRange(document: TextDocument, range: Range) {
    const keyAndRange = this.getKeyAndRange(document, range.start)
    return keyAndRange ? keyAndRange.key : null
  }

  public getKeyAndRange(document: TextDocument, position: Position) {
    if (!this.isKeyByPosition(document, position)) {
      return
    }

    const range = document.getWordRangeAtPosition(position, KEY_REGEXP)
    if (!range) {
      return
    }

    const key = document.getText(range)
    return { range, key }
  }

  private get i18nRegexp() {
    const methods = this.translateMethods().map(escapeStringRegexp)
    const i18nRegexp = new RegExp(
      `[^a-z.](?:${methods.join('|')})['"\\s(]+([a-zA-Z0-9_.]*)`
    )
    return i18nRegexp
  }

  private isKeyByPosition(document: TextDocument, position: Position) {
    return !!document.getWordRangeAtPosition(position, this.i18nRegexp)
  }

  private loadDebounced = debounce(this.load, 500)

  private createFileWatchers() {
    const workspaceFolders = vscode.workspace
      .workspaceFolders as WorkspaceFolder[]
    const patterns = workspaceFolders.map((workspaceFolder) => {
      return new RelativePattern(workspaceFolder, this.globPattern)
    })
    const fileWatchers = patterns.map((pattern) => {
      return vscode.workspace.createFileSystemWatcher(pattern)
    })
    for (const fileWatcher of fileWatchers) {
      fileWatcher.onDidChange(() => {
        this.loadDebounced()
      })
    }

    return fileWatchers
  }

  private async parse(): Promise<{
    merged: Record<string, Translation>
    byLocale: Map<string, Map<string, Translation>>
  }> {
    const localePaths = await vscode.workspace.findFiles(this.globPattern)
    try {
      const localeWithTranslationsEntries = await Promise.all(
        localePaths.map(({ path }) => {
          return new Parser(path).parse()
        })
      )
      const sortedLocaleWithTranslationsEntries = sortBy(
        localeWithTranslationsEntries.flat(),
        ([locale]) => {
          const index = priorityOfLocales().indexOf(locale)
          return index < 0 ? 100 : index + 1
        }
      )

      const translationsArray = sortedLocaleWithTranslationsEntries
        .reverse()
        .map(([, translations]) => translations)

      // 言語別データの構築
      const byLocale = new Map<string, Map<string, Translation>>()
      for (const [
        locale,
        translations,
      ] of localeWithTranslationsEntries.flat()) {
        byLocale.set(locale, new Map(Object.entries(translations)))
      }

      return {
        merged: Object.assign({}, ...translationsArray),
        byLocale,
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}
