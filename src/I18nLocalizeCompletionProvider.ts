import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  TextDocument,
  Range,
  Position
} from "vscode";
import I18n from "./i18n";
import escapeStringRegexp from "escape-string-regexp";

type LocalizeType = 'date' | 'time';

const METHOD_NAME_SUFFIXES = [
  {
    type: "date" as const,
    suffixes: ["_on", "date", "day", "tomorrow"]
  },
  {
    type: "time" as const,
    suffixes: ["_at", "time", "now", ".in_time_zone"]
  }
];

const typeOfMethodName = (methodName: string): LocalizeType | undefined => {
  const value = METHOD_NAME_SUFFIXES.find(({ suffixes }) =>
    suffixes.some(suffix => methodName.endsWith(suffix))
  );
  return value ? value.type : undefined;
};

export default class I18nLocalizeCompletionProvider
  implements CompletionItemProvider {
  constructor(private i18n: I18n) {}

  public provideCompletionItems(document: TextDocument, position: Position) {
    const methods = this.i18n.localizeMethods().map(escapeStringRegexp);
    const lineRegexp = new RegExp(
      `[^a-z.](?:${methods.join(
        "|"
      )})(?:\\s+|\\()([@\\w.]+),\\s*format: :[a-zA-Z0-9_]*$`
    );
    const line = document.getText(
      new Range(
        new Position(position.line, 0),
        new Position(position.line, position.character)
      )
    );
    const matches = line.match(lineRegexp);
    if (!matches) {
      return null;
    }

    const methodType = typeOfMethodName(matches[1]);
    return this.buildCompletionItems(methodType);
  }

  private buildCompletionItems(methodType?: LocalizeType) {
    return Array.from(this.i18n.entries())
      .filter(([key]) => {
        if (methodType) {
          return key.startsWith(`${methodType}.formats.`);
        }

        return (
          key.startsWith("date.formats.") || key.startsWith("time.formats.")
        );
      })
      .map(([key, translation]) => {
        const [type, , format] = key.split(".");
        const item = new CompletionItem(format, CompletionItemKind.Keyword);
        item.detail = type;
        item.documentation = translation.value;
        item.sortText = '0';
        return item;
      });
  }
}
