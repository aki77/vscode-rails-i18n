# Rails I18n VSCode Extension Demo Application Configuration
# This file enables the Rails I18n extension activation

require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module RailsI18nDemo
  class Application < Rails::Application
    # Configuration for the application, engines, and railties goes here.
    config.load_defaults 7.0

    # Configuration for I18n
    config.i18n.available_locales = [:en, :ja, :fr]
    config.i18n.default_locale = :en
    config.i18n.fallbacks = [I18n.default_locale]
  end
end
