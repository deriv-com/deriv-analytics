import { Growthbook } from './growthbook'
import { RudderStack } from './rudderstack'
import { TAttributes, TEvents } from './types'

type Options = {
    growthbookKey: string
    growthbookDecryptionKey: string
    rudderstackKey: string
    enableDevMode: boolean
}

export function createAnalyticsInstance(options?: Options) {
    let _growthbook: Growthbook, _rudderstack: RudderStack

    const initialise = ( { growthbookKey, growthbookDecryptionKey, rudderstackKey, enableDevMode }: Options) => {
        _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey)
        _growthbook = Growthbook.getGrowthBookInstance(
            growthbookKey,
            growthbookDecryptionKey,
            enableDevMode,
        )
    }

    if (options) {
        initialise(options)
    }
    let coreData = {}
    const setAttributes = ( { country,  user_language, device_language, device_type, account_type }: TAttributes) => {
        const user_id = getId()
        _growthbook.setAttributes({
            id: user_id,
            country,
            user_language,
            device_language,
            device_type,
        })
        _rudderstack.identifyEvent(user_id, { language: user_language })
        coreData = { user_language, account_type }
    }

    const getFeatureState = (id: string) => _growthbook.getFeatureState(id)?.experimentResult?.name
    const getFeatureValue = (id: string, defaultValue: string) =>
        _growthbook.getFeatureValue(id, defaultValue)
    const setUrl = (href: string) => _growthbook.setUrl(href)
    const getId = () => _rudderstack.getUserId() || _rudderstack.getAnonymousId()

    const trackEvent = <T extends keyof TEvents>(event: T, analyticsData: TEvents[T]) => {
        _rudderstack.track(event, { ...coreData, ...analyticsData })
    }
    const getInstances = () => ({ ab: _growthbook, tracking: _rudderstack })

    return {
        initialise,
        setAttributes,
        getFeatureState,
        getFeatureValue,
        setUrl,
        getId,
        trackEvent,
        getInstances,
    }
}

export const Analytics = createAnalyticsInstance()
