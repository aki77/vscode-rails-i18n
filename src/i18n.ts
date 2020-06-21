import * as vscode from "vscode";
import {
  FileSystemWatcher,
  WorkspaceFolder,
  RelativePattern,
  TextDocument,
  Range,
  Position
} from "vscode";
import { readFile } from "fs";
import { promisify } from "util";
import * as yaml from "js-yaml";
import { flatten } from "flat";

const fromPairs = require("lodash.frompairs");
const sortBy = require("lodash.sortby");
const merge = require("lodash.merge");
const escapeStringRegexp = require("escape-string-regexp");

const readFileAsync = promisify(readFile);

const KEY_REGEXP = /[a-zA-Z0-9_.]+/;

interface Translation {
  locale: string,
  path: string,
  value: string
}

export default class I18n {
  private translations: Map<string, Translation> = new Map();
  private fileWatchers: FileSystemWatcher[];

  constructor(private globPettern: string) {
    this.fileWatchers = this.createFileWatchers();
  }

  public dispose() {
    this.translations.clear();
    this.fileWatchers.map(fileWatcher => {
      fileWatcher.dispose();
    });
  }

  public get(key: string) {
    return this.translations.get(key);
  }

  public entries() {
    return this.translations.entries();
  }

  public load() {
    const progressOptions = {
      location: vscode.ProgressLocation.Window,
      title: "Loading rails I18n"
    };

    vscode.window.withProgress(progressOptions, async () => {
      this.translations.clear();
      const translations = await this.parse();
      this.translations = new Map(Object.entries(translations));
    });
  }

  public translateMethods(): string[] {
    return vscode.workspace.getConfiguration("railsI18n").translateMethods;
  }

  public localizeMethods(): string[] {
    return vscode.workspace.getConfiguration("railsI18n").localizeMethods;
  }

  public getKeyByRange(document: TextDocument, range: Range) {
    const keyAndRange = this.getKeyAndRange(document, range.start);
    return keyAndRange ? keyAndRange.key : null;
  }

  public getKeyAndRange(document: TextDocument, position: Position) {
    if (!this.isKeyByPosition(document, position)) {
      return;
    }

    const range = document.getWordRangeAtPosition(position, KEY_REGEXP);
    if (!range) {
      return;
    }

    const key = document.getText(range);
    return { range, key };
  }

  private get i18nRegexp() {
    const methods = this.translateMethods().map(escapeStringRegexp);
    const i18nRegexp = new RegExp(
      `[^a-z.](?:${methods.join("|")})['"\\s(]+([a-zA-Z0-9_.]*)`
    );
    return i18nRegexp;
  }

  private isKeyByPosition(document: TextDocument, position: Position) {
    return !!document.getWordRangeAtPosition(position, this.i18nRegexp);
  }

  private createFileWatchers() {
    const workspaceFolders = vscode.workspace
      .workspaceFolders as WorkspaceFolder[];
    const patterns = workspaceFolders.map(workspaceFolder => {
      return new RelativePattern(workspaceFolder, this.globPettern);
    });
    const fileWatchers = patterns.map(pattern => {
      return vscode.workspace.createFileSystemWatcher(pattern);
    });
    fileWatchers.forEach(fileWatcher => {
      fileWatcher.onDidChange(() => {
        this.load();
      });
    });

    return fileWatchers;
  }

  private async readFileAsyncWrapper(path: string) {
    return [path, await readFileAsync(path)]
  }

  private jsonToTranslation(locale: string, path: string, values: any) {
    values = values ? flatten(values) : {};

    Object.keys(values).map(key => {
      values[key] = { locale, path, value: values[key] };
    });

    return values;
  }

  private async parse() {
    const localePaths = await vscode.workspace.findFiles(this.globPettern);
    const buffers = await Promise.all(
      localePaths.map(({ path }) => this.readFileAsyncWrapper(path))
    );
    const jsonArray = buffers.map(([path, buffer]) =>
      [path, yaml.safeLoad(buffer.toString(), { json: true })]
    );
    const translationsArray = jsonArray.map(([path, json]) => {
      const locales = Object.keys(json).map(locale => {
        const values = this.jsonToTranslation(locale, path, json[locale]);
        return [locale, values];
      });
      return fromPairs(locales);
    });

    const translations = merge({}, ...translationsArray);
    return this.mergeTranslations(translations);
  }

  private mergeTranslations(translations: { [locale: string]: {} }) {
    const priorityData = Object.keys(translations).map(locale => {
      const priorityOfLocales = vscode.workspace.getConfiguration("railsI18n")
        .priorityOfLocales as string[];
      const index = priorityOfLocales.indexOf(locale);
      return {
        priority: index < 0 ? 100 : index + 1,
        data: translations[locale]
      };
    });
    const sortedTranslations = sortBy(priorityData, "priority")
      .map(({ data }: { data: {} }) => data)
      .reverse();
    return Object.assign({}, ...sortedTranslations);
  }
}
