import * as path from 'node:path'
import { type TextDocument, workspace, Range } from 'vscode'
import escapeStringRegexp from 'escape-string-regexp'

export function isLazyLookupKey(key: string) {
  return key.startsWith('.')
}

export function asAbsoluteKey(key: string, document: TextDocument) {
  if (!isLazyLookupKey(key)) {
    return key
  }

  const relativePath = workspace.asRelativePath(document.uri)
  const dirName = path.dirname(relativePath)
  if (!dirName.startsWith('app/views')) {
    // TODO: Support for controller
    return null
  }
  const [, , ...parts] = dirName
    .split('/')
    .map((part) => part.replace(/^_/, ''))
  const basename = path
    .basename(relativePath)
    .split('.', 2)[0]
    .replace(/^_/, '')

  return [...parts, basename].join('.') + key
}

/**
 * ドキュメント内の全I18nキーとその位置を検出します
 */
export function getAllI18nKeys(
  document: TextDocument,
  translateMethods: string[]
): Array<{ key: string; range: Range }> {
  const text = document.getText()
  const methods = translateMethods.map(escapeStringRegexp)
  const regex = new RegExp(
    `[^a-z.](?:${methods.join('|')})['"\\s(]+([a-zA-Z0-9_.]+)`,
    'g'
  )

  const keys: Array<{ key: string; range: Range }> = []
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec loop
  while ((match = regex.exec(text)) !== null) {
    const keyText = match[1]
    const keyStartIndex = match.index + match[0].indexOf(keyText)
    const startPos = document.positionAt(keyStartIndex)
    const endPos = document.positionAt(keyStartIndex + keyText.length)

    keys.push({
      key: keyText,
      range: new Range(startPos, endPos),
    })
  }

  return keys
}
