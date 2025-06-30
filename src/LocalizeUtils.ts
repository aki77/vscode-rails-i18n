import type { Position, Range, TextDocument } from 'vscode'

export type LocalizeType = 'date' | 'time'

export const METHOD_NAME_SUFFIXES = [
  {
    type: 'date' as const,
    suffixes: ['_on', 'date', 'day', 'tomorrow'],
  },
  {
    type: 'time' as const,
    suffixes: ['_at', 'time', 'now', '.in_time_zone'],
  },
]

export const typeOfMethodName = (
  methodName: string
): LocalizeType | undefined => {
  const value = METHOD_NAME_SUFFIXES.find(({ suffixes }) =>
    suffixes.some((suffix) => methodName.endsWith(suffix))
  )
  return value ? value.type : undefined
}

/**
 * Represents information about a localization method invocation.
 *
 * @property methodName - The name of the localization method (e.g., 't', 'translate').
 * @property variableName - The variable name used to call the localization method.
 * @property formatKey - The key or format string used for localization.
 * @property range - The range in the source code where the localization method is used.
 * @property type - The type of localization, or undefined if not specified.
 */
export type LocalizeMethodInfo = {
  methodName: string
  variableName: string
  formatKey: string
  range: Range
  type: LocalizeType | undefined
}

export function parseLocalizeMethod(
  document: Pick<TextDocument, 'getText'> & {
    lineAt: (line: number) => { text: string }
  },
  position: Position
): LocalizeMethodInfo | undefined {
  const line = document.lineAt(position.line).text

  // More comprehensive localize method pattern: method(variable, format: :key)
  // Supports both spaced and parentheses syntax: l var, format: :key or l(var, format: :key)
  const localizePattern =
    /([a-z_]+)(?:\s+|\()\s*([@\w.]+)\s*,\s*format:\s*:(\w+)/g

  // Find all matches and check which one contains the cursor position
  const matches = [...line.matchAll(localizePattern)]

  for (const match of matches) {
    const [, methodName, variableName, formatKey] = match
    const startIndex = match.index ?? 0

    // Check if position is within the format key part
    const formatStart = line.indexOf(`:${formatKey}`, startIndex)
    const formatEnd = formatStart + formatKey.length + 1 // +1 for the ':'

    if (position.character >= formatStart && position.character <= formatEnd) {
      const range = {
        start: { line: position.line, character: formatStart },
        end: { line: position.line, character: formatEnd },
      } as Range

      const type = typeOfMethodName(variableName)

      return {
        methodName,
        variableName,
        formatKey,
        range,
        type,
      }
    }
  }

  return undefined
}

export function getLocalizeFormatKey(
  formatKey: string,
  type?: LocalizeType
): string[] {
  if (type) {
    return [`${type}.formats.${formatKey}`]
  }

  return [`date.formats.${formatKey}`, `time.formats.${formatKey}`]
}
