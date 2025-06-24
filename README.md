# Rails I18n

[![CI](https://github.com/aki77/vscode-rails-i18n/actions/workflows/ci.yml/badge.svg)](https://github.com/aki77/vscode-rails-i18n/actions/workflows/ci.yml)

VS Code extension for Rails I18n with intelligent code completion, hover information, inline annotations, and navigation features.

## Features

### Code Completion

Intelligent auto-completion for both translate and localize methods:

![translate](https://i.gyazo.com/f05479cbeeae524235096223e7636164.gif)

![localize](https://i.gyazo.com/2430eb641cf8f2628dfa3fe86586f934.gif)

### Hover Information

Multi-language translation preview on hover. Shows translations for all configured languages in priority order:

![hover](https://i.gyazo.com/9c94085f90553a633d599bb8340f27f5.png)

### Inline Annotations

Translation text displayed inline with I18n keys for better code readability:

![annotation](https://i.gyazo.com/e498fd4389993664aac637d2fa15a17a.png)

### Go to Definition

Navigate directly to translation definitions in locale files:

![Goto](https://i.gyazo.com/1e57c68dca96dae3a2f7831a0801ba0a.gif)

### Quick Fix

Fixes lazy I18n keys (e.g. converts lazy keys to full keys):

![quickfix](https://i.gyazo.com/5c97d57a3a692f9b253ddc40655e5703.gif)

## Configuration

Configure the extension through VS Code settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `railsI18n.translateMethods` | I18n translate methods | `["I18n.translate", "I18n.t", "t"]` |
| `railsI18n.localizeMethods` | I18n localize methods | `["I18n.localize", "I18n.l", "l"]` |
| `railsI18n.localeFilePattern` | Locale file glob pattern | `"config/locales/*.yml"` |
| `railsI18n.priorityOfLocales` | Priority order for languages | `["en"]` |
| `railsI18n.languagesEnableHoverProvider` | Languages for hover support | `["ruby", "erb", "haml", "slim"]` |
| `railsI18n.annotations` | Enable inline annotations | `true` |
| `railsI18n.annotationInPlace` | Show translation text inline | `true` |
| `railsI18n.annotationMaxLength` | Max annotation text length | `40` |

## Commands

Access these commands via Command Palette (`Cmd+Shift+P`):

- **Rails I18n: Reload locale files** - Refresh translation files
- **Rails I18n: Go to Translation** - Browse and navigate to translations

## Getting Started

1. Install the extension
2. Open a Rails project with `config/locales/*.yml` files
3. Start editing Ruby, ERB, HAML, or Slim files
4. Enjoy intelligent I18n support!
