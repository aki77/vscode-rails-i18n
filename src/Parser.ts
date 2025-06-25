import { readFile } from 'node:fs'
import { promisify } from 'node:util'
import { Range, workspace } from 'vscode'
import type { Pair } from 'yaml'
import { type Document, parseDocument } from 'yaml'
import { availableLocale } from './utils.js'

const readFileAsync = promisify(readFile)

export type Translation = {
  locale: string
  path: string
  value: string
  range: Range
}

export type LocaleValues = Record<string, Translation>

export class Parser {
  constructor(private path: string) {}

  public async parse(): Promise<[string, LocaleValues][]> {
    const buffer = await readFileAsync(this.path)
    const document = parseDocument(buffer.toString())
    const json = document.toJSON() as Record<string, any>
    const availableLocaleEntries = Object.entries(json).filter(([locale]) =>
      availableLocale(locale.replace(/^:/, ''))
    )

    return await Promise.all(
      availableLocaleEntries.map(
        async ([locale, values]): Promise<[string, LocaleValues]> => {
          const normalizedLocale = locale.replace(/^:/, '')
          const localeValues = await this.buildLocaleValues(
            normalizedLocale,
            document,
            values
          )
          return [normalizedLocale, localeValues]
        }
      )
    )
  }

  private async buildLocaleValues(
    locale: string,
    document: Document.Parsed,
    values: any
  ): Promise<LocaleValues> {
    // SEE: https://stackoverflow.com/questions/70620025/how-do-i-import-an-es6-javascript-module-in-my-vs-code-extension-written-in-type
    const flatten = (await import('flat')).flatten
    const normalizedValues = this.normalizeSymbolKeys(values)
    const flattenedValues = normalizedValues
      ? flatten<any, Record<string, string>>(normalizedValues)
      : {}
    const localeText = await workspace.openTextDocument(this.path)

    return Object.fromEntries(
      Object.entries(flattenedValues).map(([key, value]) => {
        const normalizedLocale = locale.replace(/^:/, '')
        const absoluteKeys: [string, ...string[]] = [locale, ...key.split('.')]
        const scalar = this.getScalar(document.contents, absoluteKeys)
        const pos = localeText.positionAt(scalar ? scalar.key.range[0] : 0)

        return [
          key,
          {
            locale: normalizedLocale,
            path: this.path,
            value: value?.toString() ?? '',
            range: new Range(pos, pos),
          },
        ]
      })
    )
  }

  private normalizeSymbolKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.normalizeSymbolKeys(item))
    }

    const normalized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const normalizedKey = key.replace(/^:/, '')
      normalized[normalizedKey] = this.normalizeSymbolKeys(value)
    }
    return normalized
  }

  private getScalar(
    contents: any,
    absoluteKeys: string[]
  ): Pair<any, any> | undefined {
    const lastKey = absoluteKeys.pop()
    const rootScalar = contents.getIn(absoluteKeys)
    if (!rootScalar?.items) {
      return undefined
    }

    return rootScalar.items.find((pair: Pair<any, any> | null) => {
      const keyValue = pair?.key?.value
      return keyValue === lastKey || keyValue === `:${lastKey}`
    })
  }
}
