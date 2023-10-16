type SignupProvider = 'email' | 'phone' | 'google' | 'facebook' | 'apple'
type VirtualSignupFormAction = 'open' | 'started' | 'email_confirmation_sent' | 'email_confirmed' | 'signup_continued' | 'country_selection_screen_opened' | 'password_screen_opened' | 'signup_done' | 'signup_flow_error' | 'go_to_login'
type VirtualSignupForm = {
    action?: VirtualSignupFormAction
    signup_provider?: SignupProvider
    form_source?: string
    form_name?: string
    error_message?: string
    email?: string
    app_id?: string
}
type RealAccountSignupFormAction = 'open' | 'step_passed' | 'save' | 'restore' | 'close' | 'real_signup_error' | 'other_error' | 'real_signup_finished'
type RealAccountSignupForm = {
    action?: RealAccountSignupFormAction
    step_codename?: string
    step_num?: number
    user_choice?: string
    source?: string
    form_name?: string
    real_signup_error_message?: string
    landing_company: string
}
type VirtualSignupEmailConfirmationAction = 'received' | 'expired' | 'confirmed' | 'error'
type VirtualSignupEmailConfirmation = {
    action?: VirtualSignupEmailConfirmationAction
    signup_provider?: SignupProvider
    form_source?: string
    email_md5?: string
    error_message?: string
}
type TradeTypesFormAction = 'open' | 'close' | 'choose_trade_type' | 'search' | 'info_open' | 'info-switcher' | 'info_close'
type TradeTypesForm = {
    action?: TradeTypesFormAction
    trade_type_name?: string
    tab_name?: string
    search_string?: string
    info_switcher_mode?: 'description' | 'glossary'
    form_source?: string
    subform_name?: string
    account_type?: string
}
type DbotTypesAction = 'open' | 'close' | 'search' | 'delete' | 'yes' | 'no'| 'search_string' | 'choose_shortcut' | 'bot_last_modified_time' | 'delete_popup_respond' | 'push_open_button' | 'push_user_guide' | 'save_your_bot' | 'choose_your_bot' | 'delete_your_bot'
type DbotTypes = {
    action?: DbotTypesAction
    shortcut_name?: string
    form_source?: string
    search_string?: string
    delete_popup_respond?: string
    bot_last_modified_time?: number
    bot_name?: string
};

export type TEvents = {
    ce_virtual_signup_form: VirtualSignupForm
    ce_real_account_signup_form: RealAccountSignupForm
    ce_virtual_signup_email_confirmation: VirtualSignupEmailConfirmation
    ce_trade_types_form: TradeTypesForm
    ce_bot_dashboard_form: DbotTypes
}