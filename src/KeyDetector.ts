import * as path from 'node:path'
import escapeStringRegexp from 'escape-string-regexp'
import { type Position, Range, type TextDocument, workspace } from 'vscode'

// Pattern to match both Model.human_attribute_name :attr and Model.human_attribute_name(:attr)
const HUMAN_ATTRIBUTE_NAME_PATTERN =
  /([A-Z][a-zA-Z0-9_]*?)\.human_attribute_name\s*(?:\(\s*)?:([a-zA-Z0-9_]+)\s*\)?/g

/**
 * Creates a human_attribute_name key info object from a regex match
 * Common logic shared between getHumanAttributeNameKeys and getHumanAttributeNameKeyAtPosition
 */
function createHumanAttributeNameKey(
  match: RegExpMatchArray,
  matchStart: number,
  document: TextDocument
): { key: string; range: Range; originalText: string } {
  const modelName = match[1]
  const attributeName = match[2]
  const fullMatch = match[0]

  // Convert to ActiveRecord i18n key format
  const snakeCaseModelName = modelName.replace(/([A-Z])/g, (_, p1, offset) =>
    offset > 0 ? `_${p1.toLowerCase()}` : p1.toLowerCase()
  )
  const i18nKey = `activerecord.attributes.${snakeCaseModelName}.${attributeName}`

  // Find the position of the attribute name in the match
  const attributeStartInMatch = fullMatch.indexOf(`:${attributeName}`) + 1 // Skip the ':'
  const attributeStartIndex = matchStart + attributeStartInMatch
  const startPos = document.positionAt(attributeStartIndex)
  const endPos = document.positionAt(attributeStartIndex + attributeName.length)

  return {
    key: i18nKey,
    range: new Range(startPos, endPos),
    originalText: fullMatch,
  }
}

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

/**
 * Detects human_attribute_name calls and converts them to the corresponding i18n key
 * Supports both Model.human_attribute_name :attr and Model.human_attribute_name(:attr) patterns
 */
export async function getHumanAttributeNameKeys(
  document: TextDocument
): Promise<Array<{ key: string; range: Range; originalText: string }>> {
  const text = document.getText()
  const keys: Array<{ key: string; range: Range; originalText: string }> = []

  // Reset the regex lastIndex to ensure proper matching from the beginning
  HUMAN_ATTRIBUTE_NAME_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec loop
  while ((match = HUMAN_ATTRIBUTE_NAME_PATTERN.exec(text)) !== null) {
    const matchStart = match.index
    keys.push(createHumanAttributeNameKey(match, matchStart, document))
  }

  return keys
}

/**
 * Checks if the given position is within a human_attribute_name pattern and returns the key info
 * More efficient than scanning the entire document when only checking a specific position
 */
export function getHumanAttributeNameKeyAtPosition(
  document: TextDocument,
  position: Position
): { key: string; range: Range; originalText: string } | undefined {
  // Get the line text at the position - much more efficient for single-line patterns
  const lineRange = document.lineAt(position.line).range
  const lineText = document.getText(lineRange)
  const lineStartOffset = document.offsetAt(lineRange.start)

  // Use a simple match to find the pattern in the line
  const pattern = new RegExp(HUMAN_ATTRIBUTE_NAME_PATTERN.source)
  const match = lineText.match(pattern)

  // Early return if no match found
  if (!match || match.index === undefined) {
    return undefined
  }

  const matchStart = lineStartOffset + match.index
  const matchEnd = matchStart + match[0].length
  const offset = document.offsetAt(position)

  // Early return if position is not within the match
  if (offset < matchStart || offset > matchEnd) {
    return undefined
  }

  return createHumanAttributeNameKey(match, matchStart, document)
}
