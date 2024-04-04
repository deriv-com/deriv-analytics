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
type BotDashboardForm = {
    action?:
        | 'open'
        | 'close'
        | 'search'
        | 'delete'
        | 'yes'
        | 'no'
        | 'search_string'
        | 'choose_shortcut'
        | 'bot_last_modified_time'
        | 'delete_popup_respond'
        | 'push_open_button'
        | 'push_user_guide'
        | 'save_your_bot'
        | 'edit_your_bot'
        | 'choose_your_bot'
        | 'delete_your_bot'
    shortcut_name?: string
    form_source?: string
    form_name?: string
    search_string?: string
    delete_popup_respond?: string
    bot_last_modified_time?: number
    bot_name?: string
    bot_status?: string
    preview_mode?: string
}
type BotQuickStrategyForm = {
    action?:
        | 'open'
        | 'close'
        | 'choose_strategy_type'
        | 'switch_strategy_mode'
        | 'choose_asset'
        | 'choose_trade_type'
        | 'choose_trade_type_mode'
        | 'choose_duration'
        | 'change_parameter_value'
        | 'info_popup_open'
        | 'run_strategy'
        | 'loss_threshold_warning_popup'
        | 'learn_more_expansion'
        | 'learn_more_collapse'
        | 'edit_strategy'
    form_source?: 'ce_bot_dashboard_form' | 'ce_bot_builder_form'
    form_name?: 'ce_bot_quick_strategy_form'
    strategy_type?:
        | `d'alembert`
        | `martingale`
        | `oscar's-grind`
        | `reverse martingale`
        | `reverse d'alembert`
        | `1-3-2-6`
    strategy_switcher_mode?: 'learn more' | 'trade parameters'
    asset_type?: string
    trade_type?: string
    trade_type_mode?: string
    duration_type?: 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days'
    parameter_type?:
        | 'initial-stake'
        | 'duration'
        | 'profit-threshold'
        | 'loss-threshold'
        | 'size-unit'
        | 'max-stake'
        | string
    parameter_field_type?: 'input' | 'dropdown' | 'slider' | 'checkbox' | 'number'
    parameter_value?: string | number | boolean
    plus_minus_push?: 'yes' | 'no'
    manual_parameter_input?: 'yes' | 'no'
    dont_show_checkbox?: 'yes' | 'no'
    cta_name?: 'edit_the_amount' | 'yes_continue'
    learn_more_title?: string
}
type BotBuilderForm = {
    action?: 'open' | 'close' | 'search'
    form_source?: 'bot_header_form' | 'bot_dashboard_form'
    search_string?: string
}
type BotTutorialForm = {
    action?: 'open' | 'close' | 'search'
    form_source?:
        | 'bot_header_form'
        | 'bot_dashboard_form-shortcut'
        | 'bot_dashboard_form-edit'
        | 'bot_dashboard_form-open'
    search_string?: string
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
type TradersHubPerformanceMetricsAction = {
    action:
        | 'create_mt5_account_time'
        | 'create_dxtrade_account_time'
        | 'create_ctrader_account_time'
        | 'load_cashier_time'
        | 'load_crypto_deposit_cashier_time'
        | 'load_fiat_deposit_cashier_time'
        | 'login_time'
        | 'redirect_from_deriv_com_time'
        | 'signup_time'
        | 'switch_currency_accounts_time'
        | 'switch_from_demo_to_real_time'
        | 'switch_from_real_to_demo_time'
    value: number
    device: 'desktop' | 'mobile'
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
    ce_bot_dashboard_form: BotDashboardForm
    ce_bot_quick_strategy_form: BotQuickStrategyForm
    ce_bot_builder_form: BotBuilderForm
    ce_bot_tutorial_form: BotTutorialForm
    ce_contracts_set_up_form: ContractsSetupForm
    ce_indicators_types_form: IndicatorsTypesFormAction
    ce_trade_types_form: TradeTypesForm
    ce_chart_types_form: ChartTypesFormAction
    ce_market_types_form: MarketTypesFormAction
    ce_reports_form: ReportsFormAction
    ce_tradershub_onboarding_form: TradersHubOnboardingFormAction
    ce_upgrade_mt5_banner: UpgradeMT5BannerAction
    ce_traders_hub_performance_metrics: TradersHubPerformanceMetricsAction
    ce_traders_hub_v2_performance_metrics: TradersHubPerformanceMetricsAction
    ce_traders_hub_v3_performance_metrics: TradersHubPerformanceMetricsAction
}
