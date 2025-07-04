import escapeStringRegexp from 'escape-string-regexp'

/**
 * Common utility to create escaped pattern string from list of method names
 */
export function createMethodPattern(methods: string[]): string {
  return methods.map(escapeStringRegexp).join('|')
}

/**
 * Templates for commonly used regular expression patterns
 * {{METHODS}} placeholder will be replaced with method patterns
 */
export const REGEX_PATTERNS = {
  // Basic translation method pattern (for getAllI18nKeys)
  TRANSLATE_BASIC: "(?:[^a-z.']|^)(?:{{METHODS}})['\"\\s(]+([a-zA-Z0-9_.]+)",

  // Translation method completion pattern
  TRANSLATE_COMPLETION: '[^a-z.](?:{{METHODS}})[\'"\\s(]+([a-zA-Z0-9_.]*)$',

  // Translation method prefix completion pattern
  TRANSLATE_PREFIX_COMPLETION:
    '[^a-z.](?:{{METHODS}})\\s*\\(\\s*[\'"](\\.[a-zA-Z0-9_.]*)$',

  // Localize method pattern (with format parameter)
  LOCALIZE_METHOD:
    '([{{METHODS}}])(?:\\s+|\\()\\s*([@\\w.]+)\\s*,\\s*format:\\s*:([\\w]+)',

  // Localize method completion pattern
  LOCALIZE_COMPLETION:
    '[^a-z.](?:{{METHODS}})(?:\\s+|\\()([@\\w.]+),\\s*format: :[a-zA-Z0-9_]*$',
} as const

/**
 * Create regular expression from pattern template including methods
 */
export function createRegexFromPattern(
  methods: string[],
  patternTemplate: string,
  flags?: string
): RegExp {
  const methodPattern = createMethodPattern(methods)
  const pattern = patternTemplate.replace('{{METHODS}}', methodPattern)
  return new RegExp(pattern, flags)
}

/**
 * Create regular expression for translation methods (for backward compatibility)
 */
export function createTranslateRegex(
  methods: string[],
  patternTemplate: string,
  flags?: string
): RegExp {
  return createRegexFromPattern(methods, patternTemplate, flags)
}
