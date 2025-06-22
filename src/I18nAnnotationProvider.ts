import {
  window,
  workspace,
  type DecorationOptions,
  type Range,
  type Disposable,
  type TextEditorDecorationType,
  type TextEditor,
  type TextDocument,
} from 'vscode'
import debounce from 'debounce'
import type I18n from './i18n.js'
import { getTranslationForKey } from './TranslationHelper.js'
import { getAllI18nKeys } from './KeyDetector.js'

export default class I18nAnnotationProvider implements Disposable {
  private disposables: Disposable[] = []
  private annotationDecorationType!: TextEditorDecorationType
  private underlineDecorationType!: TextEditorDecorationType
  private missingDecorationType!: TextEditorDecorationType

  constructor(private i18n: I18n) {
    this.setupDecorationTypes()
    this.setupEventListeners()
    this.updateAnnotations()
  }

  private setupDecorationTypes() {
    this.annotationDecorationType = window.createTextEditorDecorationType({
      after: {
        color: '#999999',
        fontStyle: 'italic',
      },
    })

    this.underlineDecorationType = window.createTextEditorDecorationType({
      textDecoration: 'underline dotted #cccccc',
    })

    this.missingDecorationType = window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 255, 0, 0.2)',
      after: {
        color: '#ff6b6b',
        contentText: ' [missing translation]',
        fontStyle: 'italic',
      },
    })
  }

  private setupEventListeners() {
    const debouncedUpdate = debounce(() => this.updateAnnotations(), 100)

    this.disposables.push(
      window.onDidChangeActiveTextEditor(debouncedUpdate),
      workspace.onDidChangeTextDocument((e) => {
        if (e.document === window.activeTextEditor?.document) {
          debouncedUpdate()
        }
      }),
      window.onDidChangeTextEditorSelection(debouncedUpdate),
      workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('railsI18n')) {
          debouncedUpdate()
        }
      })
    )
  }

  private updateAnnotations() {
    const editor = window.activeTextEditor
    if (!editor) {
      return
    }

    const document = editor.document
    const config = workspace.getConfiguration('railsI18n')

    // サポートされている言語かチェック
    const supportedLanguages = ['ruby', 'erb', 'haml', 'slim']
    if (!supportedLanguages.includes(document.languageId)) {
      this.clearDecorations(editor)
      return
    }

    if (!config.get('annotations', true)) {
      this.clearDecorations(editor)
      return
    }

    const keys = getAllI18nKeys(document, this.i18n.translateMethods())
    const decorations = this.createDecorations(document, keys, config)

    this.applyDecorations(editor, decorations)
  }

  private createDecorations(
    document: TextDocument,
    keys: Array<{ key: string; range: Range }>,
    config: any
  ) {
    const annotations: DecorationOptions[] = []
    const underlines: DecorationOptions[] = []
    const missing: DecorationOptions[] = []

    const maxLength = config.get('annotationMaxLength', 40)
    const inPlace = config.get('annotationInPlace', true)
    const selection = window.activeTextEditor?.selection

    for (const { key, range } of keys) {
      const result = getTranslationForKey(this.i18n, document, key)

      if (!result) continue

      // カーソルが範囲内にある場合はアノテーションを非表示
      const isEditing =
        selection &&
        ((selection.start.line <= range.start.line &&
          range.start.line <= selection.end.line) ||
          (selection.start.line <= range.end.line &&
            range.end.line <= selection.end.line))

      if (result.found && result.translation) {
        // 翻訳が見つかった場合
        let displayText = result.translation.value
        if (displayText.length > maxLength) {
          displayText = `${displayText.substring(0, maxLength)}...`
        }

        if (inPlace && !isEditing) {
          annotations.push({
            range,
            renderOptions: {
              after: {
                contentText: ` // ${displayText}`,
                color: '#999999',
                fontStyle: 'italic',
              },
            },
          })
        } else {
          underlines.push({ range })
        }
      } else {
        // 翻訳が見つからない場合
        missing.push({ range })
      }
    }

    return { annotations, underlines, missing }
  }

  private applyDecorations(
    editor: TextEditor,
    decorations: {
      annotations: DecorationOptions[]
      underlines: DecorationOptions[]
      missing: DecorationOptions[]
    }
  ) {
    editor.setDecorations(
      this.annotationDecorationType,
      decorations.annotations
    )
    editor.setDecorations(this.underlineDecorationType, decorations.underlines)
    editor.setDecorations(this.missingDecorationType, decorations.missing)
  }

  private clearDecorations(editor: TextEditor) {
    editor.setDecorations(this.annotationDecorationType, [])
    editor.setDecorations(this.underlineDecorationType, [])
    editor.setDecorations(this.missingDecorationType, [])
  }

  dispose() {
    for (const disposable of this.disposables) {
      disposable.dispose()
    }
    this.annotationDecorationType.dispose()
    this.underlineDecorationType.dispose()
    this.missingDecorationType.dispose()
  }
}
