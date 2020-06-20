import { TextDocument, workspace, Position, Range } from "vscode";
import * as path from "path";

export default class KeyDetector {
  public static isLazyLookupKey(key: string) {
    return key.startsWith(".");
  }

  public static asAbsoluteKey(key: string, document: TextDocument) {
    if (!KeyDetector.isLazyLookupKey(key)) {
      return key;
    }

    const relativePath = workspace.asRelativePath(document.uri);
    const dirName = path.dirname(relativePath);
    if (!dirName.startsWith("app/views")) {
      // TODO: Support for controller
      return null;
    }
    const [, , ...parts] = dirName.split("/");
    const basename = path.basename(relativePath).split(".", 2)[0];

    return [...parts, basename].join(".") + key;
  }

  public static asAbsoluteKeys(locale: string, key: string, position: Position, range: Range) {
    const relativeCursorPos = position.character - range.start.character;
    const keySegmentLimit = key.slice(0, relativeCursorPos).split('.').length;

    const fullKeys = key.split('.').slice(0, keySegmentLimit);

    return [locale].concat(fullKeys);
  }
}
