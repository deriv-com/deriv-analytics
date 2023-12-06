export type TGrowthbookAttributes = {
    id: string
    country?: string
    user_language?: string
    device_language?: string
    device_type?: string
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
type PartnerAccountSignupForm = {
    action:
        | 'open'
        | 'open_wizard'
        | 'step_passed'
        | 'step_back'
        | 'push_learn_more'
        | 'close_wizard'
        | 'close'
        | 'partners_signup_error'
        | 'other_error'
        | 'try_submit'
        | 'failed_popup_cta'
        | 'success_popup_opened'
        | 'success_popup_cta'
    step_codename?: string
    step_num?: number
    user_choice?: string
    form_source?: string
    form_name?: 'ce_partner_account_signup_form'
    partner_signup_error_message?: string
}
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
        | 'choose_your_bot'
        | 'delete_your_bot'
    shortcut_name?: string
    form_source?: string
    search_string?: string
    delete_popup_respond?: string
    bot_last_modified_time?: number
    bot_name?: string
}
type BotQuickStrategyForm = {
    action?:
        | 'open'
        | 'close'
        | 'choose_strategy'
        | 'switch_strategy_mode'
        | 'choose_asset'
        | 'choose_trade_type'
        | 'choose_trade_type_mode'
        | 'choose_duration'
        | 'change_parameter_value'
        | 'info_popup_open'
        | 'run_strategy'
    form_source?: 'bot_dashboard' | 'bot_builder_form'
    strategy_type?: "d'alembert" | 'martingale' | "oscar's-grind"
    strategy_switcher_mode?: 'trade-parameters' | 'description'
    asset_type?: 'gbp-basket' | 'eur-basket' | 'etc'
    trade_type?: 'rise/fall' | 'rise-equals/fall-equals' | 'etc'
    trade_type_mode?: 'rise' | 'fall' | 'rise-equals' | 'fall-equals' | 'etc'
    duration_type?: 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days'
    parameter_type?: 'initial-stake' | 'duration' | 'profit-threshold' | 'loss-threshold' | 'size-unit' | 'max-stake'
    parameter_value?: string
    plus_push_amount?: string
    minus_push_amount?: string
    manual_parameter_input?: 'yes' | 'no'
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
type TradersHubOnboardingFormAction = {
    action?: 'open' | 'close' | 'step_passed' | 'step_back' | 'choose_step_navigation'
    form_source?: 'tradershub_dashboard_form' | 'tradershub_first_entrance' | 'repeat_tour'
    step_num?: number
    step_codename?: string
}

export type TEvents = {
    ce_virtual_signup_form: VirtualSignupForm
    ce_email_verification_form: EmailVerificationForm
    ce_real_account_signup_form: RealAccountSignupForm
    ce_real_account_signup_setup_form: RealAccountSignupForm
    ce_real_account_signup_identity_form: RealAccountSignupIdentifyForm
    ce_partner_account_signup_form: PartnerAccountSignupForm
    ce_virtual_signup_email_confirmation: VirtualSignupEmailConfirmation
    ce_trade_types_form: TradeTypesForm
    ce_bot_dashboard_form: BotDashboardForm
    ce_bot_quick_strategy_form: BotQuickStrategyForm
    ce_bot_builder_form: BotBuilderForm
    ce_bot_tutorial_form: BotTutorialForm
    ce_indicators_types_form: IndicatorsTypesFormAction
    ce_market_types_form: MarketTypesFormAction
    ce_reports_form: ReportsFormAction
    ce_chart_types_form: ChartTypesFormAction
    ce_tradershub_onboarding_form: TradersHubOnboardingFormAction
}
