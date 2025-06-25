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
import { getHumanAttributeNameKeyAtPosition } from './KeyDetector.js'
import { Parser, type Translation } from './Parser.js'
import { priorityOfLocales } from './utils.js'

const KEY_REGEXP = /[a-zA-Z0-9_.]+/

export default class I18n {
  private localeTranslations: Map<string, Map<string, Translation>> = new Map()
  private fileWatchers: FileSystemWatcher[]

  constructor(private globPattern: string) {
    this.fileWatchers = this.createFileWatchers()
  }

  public dispose() {
    this.localeTranslations.clear()
    this.fileWatchers.map((fileWatcher) => {
      fileWatcher.dispose()
    })
  }

  public get(key: string): Translation | undefined {
    const primaryLocale = priorityOfLocales()[0]
    if (!primaryLocale) return undefined

    const localeMap = this.localeTranslations.get(primaryLocale)
    return localeMap?.get(key)
  }

  public entries(): IterableIterator<[string, Translation]> {
    const primaryLocale = priorityOfLocales()[0]
    if (!primaryLocale) {
      return new Map<string, Translation>().entries()
    }

    const localeMap = this.localeTranslations.get(primaryLocale)
    return localeMap?.entries() ?? new Map<string, Translation>().entries()
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
      this.localeTranslations.clear()
      const result = await this.parse()
      this.localeTranslations = result
    })
  }

  public translateMethods(): string[] {
    return vscode.workspace.getConfiguration('railsI18n').translateMethods
  }

  public localizeMethods(): string[] {
    return vscode.workspace.getConfiguration('railsI18n').localizeMethods
  }

  public async getKeyByRange(document: TextDocument, range: Range) {
    const keyAndRange = await this.getKeyAndRange(document, range.start)
    return keyAndRange ? keyAndRange.key : null
  }

  public async getKeyAndRange(document: TextDocument, position: Position) {
    // First, check for human_attribute_name patterns at the specific position
    const humanAttributeKeyInfo = getHumanAttributeNameKeyAtPosition(
      document,
      position
    )
    if (humanAttributeKeyInfo) {
      return {
        range: humanAttributeKeyInfo.range,
        key: humanAttributeKeyInfo.key,
      }
    }

    // Fallback to the original logic for regular i18n keys
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

  private async parse(): Promise<Map<string, Map<string, Translation>>> {
    const localePaths = await vscode.workspace.findFiles(this.globPattern)
    try {
      const localeWithTranslationsEntries = await Promise.all(
        localePaths.map(({ path }) => {
          return new Parser(path).parse()
        })
      )

      // Building data by language (integrating translations from the same locale)
      const byLocale = new Map<string, Map<string, Translation>>()
      for (const [
        locale,
        translations,
      ] of localeWithTranslationsEntries.flat()) {
        const existingMap =
          byLocale.get(locale) ?? new Map<string, Translation>()

        // Add a new translation to an existing translation
        for (const [key, translation] of Object.entries(translations)) {
          existingMap.set(key, translation)
        }

        byLocale.set(locale, existingMap)
      }

      return byLocale
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}
