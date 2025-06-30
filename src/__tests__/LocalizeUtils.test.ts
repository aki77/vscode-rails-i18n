import { describe, expect, it, vi } from 'vitest'

// Mock for VSCode API
const Position = vi
  .fn()
  .mockImplementation((line: number, character: number) => ({
    line,
    character,
  }))

const Range = vi.fn().mockImplementation((start: any, end: any) => ({
  start,
  end,
}))

vi.mock('vscode', () => ({
  Position,
  Range,
}))

import {
  getLocalizeFormatKey,
  METHOD_NAME_SUFFIXES,
  parseLocalizeMethod,
  typeOfMethodName,
} from '../LocalizeUtils.js'

describe('LocalizeUtils', () => {
  describe('METHOD_NAME_SUFFIXES', () => {
    it('should contain date and time suffixes', () => {
      expect(METHOD_NAME_SUFFIXES).toEqual([
        {
          type: 'date',
          suffixes: ['_on', 'date', 'day', 'tomorrow'],
        },
        {
          type: 'time',
          suffixes: ['_at', 'time', 'now', '.in_time_zone'],
        },
      ])
    })
  })

  describe('typeOfMethodName', () => {
    it('should return "date" for date-related method names', () => {
      expect(typeOfMethodName('created_on')).toBe('date')
      expect(typeOfMethodName('birth_date')).toBe('date')
      expect(typeOfMethodName('today')).toBe('date')
      expect(typeOfMethodName('tomorrow')).toBe('date')
    })

    it('should return "time" for time-related method names', () => {
      expect(typeOfMethodName('created_at')).toBe('time')
      expect(typeOfMethodName('current_time')).toBe('time')
      expect(typeOfMethodName('now')).toBe('time')
      expect(typeOfMethodName('timestamp.in_time_zone')).toBe('time')
    })

    it('should return undefined for non-matching method names', () => {
      expect(typeOfMethodName('user')).toBeUndefined()
      expect(typeOfMethodName('name')).toBeUndefined()
      expect(typeOfMethodName('id')).toBeUndefined()
    })
  })

  describe('parseLocalizeMethod', () => {
    const createMockDocument = (text: string) => ({
      getText: vi.fn((range?: any) => {
        if (!range) return text
        const lines = text.split('\n')
        const line = lines[range.start.line]
        return line?.substring(range.start.character, range.end.character) || ''
      }),
      lineAt: vi.fn((line: number) => ({
        text: text.split('\n')[line] || '',
      })),
    })

    it('should parse localize method call with format parameter', () => {
      const document = createMockDocument('l(@user.created_at, format: :short)')
      const position = Position(0, 30) // position at "short"

      const result = parseLocalizeMethod(document, position)

      expect(result).toEqual({
        methodName: 'l',
        variableName: '@user.created_at',
        formatKey: 'short',
        range: expect.any(Object),
        type: 'time',
      })
    })

    it('should parse localize method call with date variable', () => {
      const document = createMockDocument('localize(Date.today, format: :long)')
      const position = Position(0, 32) // position at "long"

      const result = parseLocalizeMethod(document, position)

      expect(result).toEqual({
        methodName: 'localize',
        variableName: 'Date.today',
        formatKey: 'long',
        range: expect.any(Object),
        type: 'date',
      })
    })

    it('should return undefined for non-localize method calls', () => {
      const document = createMockDocument('puts "hello"')
      const position = Position(0, 5)

      const result = parseLocalizeMethod(document, position)

      expect(result).toBeUndefined()
    })

    it('should return undefined when position is not on format parameter', () => {
      const document = createMockDocument('l(@user.created_at, format: :short)')
      const position = Position(0, 5) // position at method name

      const result = parseLocalizeMethod(document, position)

      expect(result).toBeUndefined()
    })
  })

  describe('getLocalizeFormatKey', () => {
    it('should return date format keys when type is date', () => {
      const result = getLocalizeFormatKey('short', 'date')
      expect(result).toEqual(['date.formats.short'])
    })

    it('should return time format keys when type is time', () => {
      const result = getLocalizeFormatKey('long', 'time')
      expect(result).toEqual(['time.formats.long'])
    })

    it('should return both date and time format keys when type is undefined', () => {
      const result = getLocalizeFormatKey('default')
      expect(result).toEqual(['date.formats.default', 'time.formats.default'])
    })

    it('should handle empty format key', () => {
      const result = getLocalizeFormatKey('', 'date')
      expect(result).toEqual(['date.formats.'])
    })
  })
})
