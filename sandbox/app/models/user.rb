class User < ApplicationRecord
  validates :name, presence: { message: I18n.t('errors.messages.blank') }
  validates :email, presence: { message: I18n.t('errors.messages.blank') },
                   uniqueness: { message: I18n.t('errors.messages.taken') }

  enum role: { admin: 0, user: 1, moderator: 2 }
  enum status: { active: 0, inactive: 1, pending: 2, archived: 3 }

  def display_name
    name.present? ? name : t('users.form.placeholders.name')
  end

  def status_label
    case status
    when 'active'
      I18n.t('common.status.active')
    when 'inactive'
      I18n.t('common.status.inactive')
    when 'pending'
      I18n.t('common.status.pending')
    when 'archived'
      I18n.t('common.status.archived')
    end
  end

  def role_label
    I18n.t("users.roles.#{role}")
  end

  # Example method that uses translation with fallback
  def welcome_message
    message = I18n.t('users.welcome_message', default: 'Welcome!')
    "#{message}, #{display_name}"
  end

  # Example of localized date formatting
  def formatted_created_at
    I18n.l(created_at, format: :long)
  end

  # Example of missing translation (will trigger missing translation detection)
  def subscription_status
    t('users.subscription.status')  # This key doesn't exist
  end
end
