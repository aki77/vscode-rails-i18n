import * as path from 'node:path'
import { type TextDocument, workspace } from 'vscode'

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
