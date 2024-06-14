export type TGrowthbookAttributes = {
    id: string
    country?: string
    user_language?: string
    device_language?: string
    device_type?: string
    utm_source?: string
    utm_medium?: 'ppc-native' | 'affiliate' | 'common' | string
    utm_campaign?: string
    is_authorised?: boolean
    url?: string
    domain?: string
    utm_content?: string
}
export type TCoreAttributes = {
    account_type?: string
    user_id?: string
    app_id?: string
    user_identity?: string
} & Partial<TGrowthbookAttributes>

type SignupProvider = 'email' | 'phone' | 'google' | 'facebook' | 'apple'

type VirtualSignupForm = {
    action?:
        | 'open'
        | 'started'
        | 'email_confirmation_sent'
        | 'email_confirmed'
        | 'signup_continued'
        | 'country_selection_screen_opened'
        | 'password_screen_opened'
        | 'signup_done'
        | 'signup_flow_error'
        | 'go_to_login'
        | 'signup_modal_open'
        | 'signup_modal_close'
    signup_provider?: SignupProvider
    form_source?: string
    form_name?: string
    error_message?: string
    email?: string
    app_id?: string
}
type EmailVerificationForm = {
    action?:
        | 'verify_popup_opened'
        | 'verify_popup_closed'
        | 'verify_popup_cta'
        | 'email_verification_sent'
        | 'email_verification_opened'
        | 'success_popup_opened'
        | 'success_popup_closed'
        | 'success_popup_cta'
    form_source?: 'ce_tradershub_real_form' | 'ce_virtual_signup_form' | 'account_setting'
    form_name?: string
    app_id?: string
}
type RealAccountSignupForm = {
    action?:
        | 'open'
        | 'step_passed'
        | 'save'
        | 'restore'
        | 'close'
        | 'real_signup_error'
        | 'other_error'
        | 'real_signup_finished'
    step_codename?: string
    step_num?: number
    user_choice?: string
    form_source?: string
    form_name?: string
    real_signup_error_message?: string
    landing_company?: string
}
type RealAccountSignupIdentifyForm = {
    action?:
        | 'open'
        | 'step_passed'
        | 'step_back'
        | 'save'
        | 'close'
        | 'real_signup_error'
        | 'other_error'
        | 'real_signup_finished'
    step_codename?: string
    step_num?: string
    user_choice?: string
    form_source?: string
    form_name?: string
    real_signup_error_message?: string
    landing_company?: string
}
type LoginForm = {
    action:
        | 'open'
        | 'login_cta'
        | 'go_to_forgot'
        | 'email_reset_password_sent'
        | 'email_reset_password_opened'
        | 'reset_password_continued'
        | 'reset_password_done'
        | 'login_flow_error'
        | 'go_to_signup'
    login_provider?: 'email' | 'phone' | 'google' | 'facebook' | 'apple'
    form_source?: 'virtual_signup_form' | 'deriv.com (log in CTA)' | 'mobile_derivGo' | string
    error_message?: string
    email?: string
}
type QuestionnaireForm = {
    action: 'open' | 'choose_answer' | 'close'
    question_code?: string
    question_content?: string
    answer_code?: string
}
type PartnerAccountSignupForm =
    | { action: 'open_wizard'; email: string }
    | { action: 'step_passed'; step_num: number; step_codename: string }
    | { action: 'step_back'; step_num: number; step_codename: string }
    | { action: 'push_learn_more' }
    | { action: 'close_wizard' }
    | { action: 'partners_signup_error'; partner_signup_error_message: string; form_name?: string }
    | { action: 'other_error'; partner_signup_error_message?: string }
    | { action: 'try_submit' }
    | { action: 'failed_popup_cta' }
    | { action: 'success_popup_opened'; user_choice: string; success_source: string; affiliate_id: string }
    | { action: 'success_popup_cta' }

type VirtualSignupEmailConfirmation = {
    action?: 'received' | 'expired' | 'confirmed' | 'error'
    signup_provider?: SignupProvider
    form_source?: string
    email_md5?: string
    error_message?: string
}
type TradeTypesForm = {
    action?: 'open' | 'close' | 'choose_trade_type' | 'search' | 'info_open' | 'info_switcher' | 'info_close'
    trade_type_name?: string
    tab_name?: string
    search_string?: string
    info_switcher_mode?: 'description' | 'glossary'
    form_source?: string
    form_name?: string
    subform_name?: string
}
type BotForm = {
    action?:
        | 'open'
        | 'close'
        | 'search'
        | 'run_bot'
        | 'run_quick_strategy'
        | 'edit_quick_strategy'
        | 'select_quick_strategy_guide'
        | 'switch_quick_strategy_tab'
        | 'choose_strategy_type'
    form_name?: 'ce_bot_form'
    subpage_source?: 'dashboard' | 'bot_builder'
    subpage_name?: 'tutorials' | 'bot_builder' | 'charts' | 'dashboard'
    subform_name?: 'quick_strategy'
    subform_source?: 'dashboard' | 'bot_builder'
    quick_strategy_tab?: 'learn more' | 'trade parameters'
    strategy_name?:
        | `d'alembert`
        | `martingale`
        | `oscar's-grind`
        | `reverse martingale`
        | `reverse d'alembert`
        | `1-3-2-6`
    strategy_type?: 'custom' | 'quick_strategy'
    search_term?: string
    asset?: string
    trade_type?: string
    purchase_condition?: string
    initial_stake?: string
}
type IndicatorsTypesFormAction = {
    action:
        | 'open'
        | 'close'
        | 'add_active'
        | 'clean_all_active'
        | 'delete_active'
        | 'edit_active'
        | 'search'
        | 'info_open'
        | 'info_close'
    form_name?: string
    indicator_type_name?: string
    indicators_category_name?: string
    search_string?: string
    subform_name?: string
}
type MarketTypesFormAction = {
    action:
        | 'open'
        | 'close'
        | 'choose_market_type'
        | 'search'
        | 'info_redirect'
        | 'add_to_favorites'
        | 'delete_from_favorites'
    form_name?: string
    market_type_name?: string
    search_string?: string
    tab_market_name?: string
}
type ReportsFormAction =
    | {
          action: 'choose_report_type'
          form_name: string
          subform_name: 'open_positions_form' | 'statement_form' | 'trade_table_form'
          trade_type_filter?: string
          growth_type_filter?: string
          start_date_filter?: string
          end_date_filter?: string
          transaction_type_filter?: string
      }
    | {
          action: 'filter_trade_type'
          form_name: string
          subform_name: 'open_positions_form'
          trade_type_filter: string
      }
    | {
          action: 'filter_growth_rate'
          form_name: string
          subform_name: 'open_positions_form'
          growth_type_filter: string
      }
    | {
          action: 'filter_dates'
          form_name: string
          subform_name: 'trade_table_form' | 'statement_form'
          start_date_filter?: string
          end_date_filter?: string
      }
    | {
          action: 'filter_transaction_type'
          form_name: string
          subform_name: 'statement_form'
          transaction_type_filter: string
      }
    | {
          action: 'open'
          form_name: string
          subform_name: string
          form_source: string
      }
    | {
          action: 'close'
          form_name: string
          subform_name: string
      }
    | {
          action: 'open_contract_details'
          form_name: string
          form_source: string
      }

type ChartTypesFormAction = {
    action?: 'open' | 'close' | 'choose_chart_type' | 'choose_time_interval'
    form_name?: string
    chart_type_name?: string
    time_interval_name?: string
}
type ContractsSetupForm = {
    form_name: string
    trade_type_name: string
} & (
    | {
          action: 'change_parameter_value'
          duration_type?: string
          input_type?: string
          parameter_field_type?: string
          parameter_type?: string
          parameter_value?: string
      }
    | {
          action: 'run_contract'
          switcher_duration_mode_name?: string
          switcher_stakepayout_mode_name?: string
      }
)
type TradersHubOnboardingFormAction = {
    action?: 'open' | 'close' | 'step_passed' | 'step_back' | 'choose_step_navigation'
    form_source?: 'tradershub_dashboard_form' | 'tradershub_first_entrance' | 'repeat_tour'
    step_num?: number
    step_codename?: string
}
type UpgradeMT5BannerAction = {
    action: 'open' | 'push_cta_upgrade'
}

type TradersHubDashboardFormAction = {
    action?:
        | 'open'
        | 'close'
        | 'switch_account_mode'
        | 'account_open'
        | 'account_get'
        | 'account_logo_push'
        | 'reset_balance'
        | 'deposit_balance'
        | 'compare_accounts_push'
    account_mode?: string
    account_name?: string
    form_name?: string
}

type PassKeyEffortlessFormAction = {
    action?: 'open' | 'close' | 'info_open' | 'info_back' | 'maybe_later' | 'get_started'
    form_source?: string
    operating_system?: string
    app_id?: string
}

type PassKeyAccountSettingsFormAction = {
    action?:
        | 'open'
        | 'close'
        | 'info_open'
        | 'info_back'
        | 'create_passkey_started'
        | 'create_passkey_reminder_passed'
        | 'create_passkey_finished'
        | 'create_passkey_continue_trading'
        | 'error'
        | 'add_more_passkeys'

    form_name?: string
    subform_name?: string
    remove_verification_provider?: string
    error_message?: string
    operating_system?: string
}

type TradersHubPopUpAction = {
    action?: 'open' | 'close' | 'click_download' | 'click_cta'
    form_name?: string
    account_mode?: string
    popup_name?: string
    popup_type?: string
}

type TradersHubBanner = {
    action?: 'open' | 'close' | 'click download' | 'click_cta'
    form_name?: string
    account_mode?: string
    banner_name?: string
    banner_type?: string
}

type WalletsMigrationFormAction = {
    action?: 'open' | 'close' | 'step_passed' | 'step_back' | 'error'
    step_num?: number
    step_codename?: string
    error_message?: string
}

export type TEvents = {
    ce_virtual_signup_form: VirtualSignupForm
    ce_email_verification_form: EmailVerificationForm
    ce_real_account_signup_form: RealAccountSignupForm
    ce_real_account_signup_setup_form: RealAccountSignupForm
    ce_real_account_signup_identity_form: RealAccountSignupIdentifyForm
    ce_login_form: LoginForm
    ce_questionnaire_form: QuestionnaireForm
    ce_partner_account_signup_form: PartnerAccountSignupForm
    ce_virtual_signup_email_confirmation: VirtualSignupEmailConfirmation
    ce_bot_form: BotForm
    ce_contracts_set_up_form: ContractsSetupForm
    ce_indicators_types_form: IndicatorsTypesFormAction
    ce_trade_types_form: TradeTypesForm
    ce_chart_types_form: ChartTypesFormAction
    ce_market_types_form: MarketTypesFormAction
    ce_reports_form: ReportsFormAction
    ce_tradershub_onboarding_form: TradersHubOnboardingFormAction
    ce_upgrade_mt5_banner: UpgradeMT5BannerAction
    ce_tradershub_dashboard_form: TradersHubDashboardFormAction
    ce_passkey_effortless_form: PassKeyEffortlessFormAction
    ce_passkey_account_settings_form: PassKeyAccountSettingsFormAction
    ce_tradershub_popup: TradersHubPopUpAction
    ce_tradershub_banner: TradersHubBanner
    ce_wallets_migration_form: WalletsMigrationFormAction
}
