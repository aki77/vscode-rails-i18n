# Rails I18n

Completion, Hover and QuickFix provider for Rails I18n.

## Features

### Completion

#### translate

![translate](https://i.gyazo.com/f05479cbeeae524235096223e7636164.gif)

#### localize

![localize](https://i.gyazo.com/2430eb641cf8f2628dfa3fe86586f934.gif)

### Hover

![hover](https://i.gyazo.com/fc5f345b620222261072389a8cea2013.gif)

### Quick fix

![quickfix](https://i.gyazo.com/5c97d57a3a692f9b253ddc40655e5703.gif)

### Goto definition

![Goto](https://i.gyazo.com/1e57c68dca96dae3a2f7831a0801ba0a.gif)

## Extension Settings

This extension contributes the following settings:

- `railsI18n.translateMethods`: `["I18n.translate", "I18n.t", "t"]`
- `railsI18n.localizeMethods`: `["I18n.localize", "I18n.l", "l"]`
- `railsI18n.localeFilePattern`: `config/locales/*.yml`
- `railsI18n.priorityOfLocales`: `["en"]`

## TODO

- [ ] Completion of activerecord error message
- [ ] Expand translation variables into snippets
- [ ] Localize method hover widget
- [ ] Translations missing report
- [ ] Extract translations from code
- [ ] Test
