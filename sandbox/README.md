# Rails I18n VSCode Extension - Sandbox Environment

This directory contains a sample Rails application for demo and testing purposes with the Rails I18n VSCode extension.

## Purpose

- Test all features of the extension in a real Rails project structure
- Provide sample code for screenshot capture
- Serve as a verification environment for new feature development

## Included Feature Demos

### 1. Completion
You can test completion in the following files:

- **Ruby files**: `app/controllers/users_controller.rb`, `app/models/user.rb`
- **ERB files**: `app/views/users/index.html.erb`, `app/views/users/show.html.erb`
- **HAML files**: `app/views/users/_form.html.haml`
- **SLIM files**: `app/views/shared/_navigation.html.slim`

#### How to test:
1. Open any file above
2. Type `t("` or `I18n.t("`
3. Confirm that the completion list of translation keys appears

### 2. Hover
Test multi-language translation display by hovering over translation keys.

#### How to test:
1. Hover over a translation key (e.g., `'users.title'`)
2. Confirm that translations for multiple languages (en, ja, fr) are shown in a table
3. Confirm that missing translations are shown as `[missing translation]`
4. Click the jump icon (📂) to go to the translation file

### 3. Inline Annotation
Test inline display of translation text next to keys in code.

#### How to test:
1. Open a Ruby or view file
2. Confirm that translation text appears next to translation keys
3. Confirm that annotation hides when the cursor is on the key
4. Confirm that missing translations are highlighted in yellow

### 4. Go to Definition
Jump from a translation key to the corresponding translation file and location.

#### How to test:
1. Right-click on a translation key
2. Select "Go to Definition"
3. Confirm that you are taken to the correct location in the translation file

### 5. Lazy Lookup
Test relative translation key lookup.

#### Example:
- In ERB: `t('.page_info')` → `users.index.page_info`
- In HAML: `t('.help_text')` → `users.form.help_text`

### 6. Missing Translation Detection
Test error detection for intentionally missing translations.

#### Examples:
- `users.experimental.feature` (missing in all languages)
- `users.subscription.status` (missing in all languages)
- `navigation.dashboard` (missing in ja)
- `common.status.archived` (missing in ja)

## File Structure

```
sandbox/
├── .vscode/
│   ├── settings.json      # Extension settings
│   └── extensions.json    # Recommended extensions
├── config/
│   ├── application.rb     # Rails config (for extension activation)
│   └── locales/
│       ├── en.yml         # English translations (complete)
│       ├── ja.yml         # Japanese translations (partial)
│       └── fr.yml         # French translations (minimal)
├── app/
│   ├── controllers/       # Ruby controller examples
│   ├── models/            # Ruby model examples
│   └── views/
│       ├── users/         # ERB, HAML examples
│       └── shared/        # SLIM examples
├── lib/tasks/             # Rake task examples
└── README.md
```

## Translation File Characteristics

### en.yml (English - base locale)
- Complete set of translation keys
- Covers UI elements, error messages, date/time formats

### ja.yml (Japanese - partial)
- About 70% translated
- Some keys intentionally missing for feature testing

### fr.yml (French - minimal)
- About 30% translated
- Many missing keys for feature testing

## Usage

1. Open this `sandbox` directory in VSCode
2. The Rails I18n extension will activate automatically
3. Open any file to test features
4. You can adjust extension settings in `.vscode/settings.json`

## Customizing Settings

You can change the following in `.vscode/settings.json`:

- `railsI18n.priorityOfLocales`: Language priority
- `railsI18n.annotations`: Enable/disable annotation
- `railsI18n.annotationInPlace`: Enable/disable inline display
- `railsI18n.annotationMaxLength`: Annotation text length limit

## Screenshot Scenarios

### Completion
1. Open `users_controller.rb`
2. Type `t("` on a new line
3. Capture the completion list

### Hover
1. Open `index.html.erb`
2. Hover over `'users.index.heading'`
3. Capture the multi-language hover display

### Annotation
1. Open `users_controller.rb`
2. Capture inline translation display
3. Capture yellow highlight for missing translations

### Go to Definition
1. Right-click a translation key
2. Select "Go to Definition"
3. Capture the jump to the translation file

## Notes

- This directory is for development and testing only
- It is excluded from extension build output (see `.vscodeignore`)
- It is not a runnable Rails application
