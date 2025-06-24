class UsersController < ApplicationController
  before_action :set_user, only: [:show, :edit, :update, :destroy]

  # GET /users
  def index
    @users = User.all
    @page_title = t('users.index.heading')

    if @users.empty?
      flash[:info] = t('users.index.empty_state')
    end

    # Example of conditional translation
    @status_message = current_user.admin? ?
                     t('common.messages.info') :
                     t('common.messages.warning')
  end

  # GET /users/1
  def show
    @page_title = t('users.show.heading')

    # Example with interpolation
    if @user.active?
      @status_text = t('common.status.active')
    else
      @status_text = t('common.status.inactive')
    end
  end

  # GET /users/new
  def new
    @user = User.new
    @form_title = t('users.form.heading')
  end

  # GET /users/1/edit
  def edit
    @form_title = t('users.form.heading')
  end

  # POST /users
  def create
    @user = User.new(user_params)

    if @user.save
      redirect_to @user, notice: t('common.messages.success')
    else
      @form_title = t('users.form.heading')
      render :new
    end
  end

  # PATCH/PUT /users/1
  def update
    if @user.update(user_params)
      redirect_to @user, notice: t('common.messages.success')
    else
      @form_title = t('users.form.heading')
      flash.now[:error] = t('common.messages.error')
      render :edit
    end
  end

  # DELETE /users/1
  def destroy
    @user.destroy
    redirect_to users_url, notice: t('common.messages.success')
  end

  private

  def set_user
    @user = User.find(params[:id])
  end

  def user_params
    params.require(:user).permit(:name, :email, :role, :status, :bio)
  end

  # Example of using I18n.t instead of t
  def format_date(date)
    I18n.l(date, format: :short)
  end

  # Example of translation with variables
  def validation_message(field, min_length)
    I18n.t('errors.messages.too_short', count: min_length)
  end
end
