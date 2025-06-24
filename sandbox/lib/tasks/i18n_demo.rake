namespace :i18n do
  desc "Demo task showing I18n usage in Rake tasks"
  task demo: :environment do
    puts t('app.name')
    puts "=" * 50

    # Example of using translations in rake tasks
    puts t('tasks.i18n_demo.starting')

    # Iterate through available locales
    I18n.available_locales.each do |locale|
      puts "\n#{t('tasks.i18n_demo.checking_locale', locale: locale)}"

      I18n.with_locale(locale) do
        # Check if key exists
        if I18n.exists?('users.title')
          puts "  ✓ #{t('users.title')}"
        else
          puts "  ✗ #{t('tasks.i18n_demo.missing_translation', key: 'users.title')}"
        end

        # Example with fallback
        message = I18n.t('tasks.i18n_demo.completion',
                        default: 'Demo completed for %{locale}',
                        locale: locale)
        puts "  #{message}"
      end
    end

    puts "\n#{t('tasks.i18n_demo.finished')}"
  end

  desc "Check for missing translations"
  task check_missing: :environment do
    puts t('tasks.check_missing.title')
    puts "=" * 50

    # This task would check for missing translations
    # Example of using I18n programmatically

    base_locale = I18n.default_locale
    base_translations = I18n.backend.send(:translations)[base_locale]

    I18n.available_locales.each do |locale|
      next if locale == base_locale

      puts "\n#{t('tasks.check_missing.checking', locale: locale)}"
      locale_translations = I18n.backend.send(:translations)[locale] || {}

      # This would recursively check for missing keys
      missing_count = check_missing_keys(base_translations, locale_translations, locale)

      if missing_count > 0
        puts t('tasks.check_missing.found_missing', count: missing_count)
      else
        puts t('tasks.check_missing.no_missing')
      end
    end
  end

  private

  def check_missing_keys(base, target, locale, path = [])
    missing_count = 0

    base.each do |key, value|
      current_path = path + [key]

      if value.is_a?(Hash)
        target_value = target[key] || {}
        missing_count += check_missing_keys(value, target_value, locale, current_path)
      else
        unless target.key?(key)
          puts "  ✗ #{current_path.join('.')}"
          missing_count += 1
        end
      end
    end

    missing_count
  end
end
