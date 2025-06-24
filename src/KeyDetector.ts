import * as path from 'node:path'
import escapeStringRegexp from 'escape-string-regexp'
import { Range, type TextDocument, workspace } from 'vscode'

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
 * Detects all I18n keys and their locations in the document
 * Processes in chunks to avoid blocking the UI thread for large files
 */
export async function getAllI18nKeys(
  document: TextDocument,
  translateMethods: string[]
): Promise<Array<{ key: string; range: Range }>> {
  const text = document.getText()
  const methods = translateMethods.map(escapeStringRegexp)
  const regex = new RegExp(
    `(?:[^a-z.']|^)(?:${methods.join('|')})['"\\s(]+([a-zA-Z0-9_.]+)`,
    'g'
  )

  const keys: Array<{ key: string; range: Range }> = []
  const CHUNK_SIZE = 100 // Process in chunks to avoid blocking UI
  let processedCount = 0
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

    processedCount++
    // Yield control back to the event loop periodically to avoid blocking
    if (processedCount % CHUNK_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return keys
}
