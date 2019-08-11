import * as vscode from "vscode";
import { FileSystemWatcher, WorkspaceFolder, RelativePattern } from "vscode";
import { readFile } from "fs";
import { promisify } from "util";
import * as yaml from "js-yaml";
import { flatten } from "flat";

const fromPairs = require("lodash.frompairs");
const sortBy = require("lodash.sortby");
const merge = require("lodash.merge");

const readFileAsync = promisify(readFile);

export default class I18n {
  private translations: Map<string, string> = new Map();
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

  private async parse() {
    const localePaths = await vscode.workspace.findFiles(this.globPettern);
    const buffers = await Promise.all(
      localePaths.map(({ path }) => readFileAsync(path))
    );
    const jsonArray = buffers.map(buffer =>
      yaml.safeLoad(buffer.toString(), { json: true })
    );
    const translationsArray = jsonArray.map(json => {
      const locales = Object.keys(json).map(locale => {
        const values = json[locale] ? flatten(json[locale]) : {};
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
