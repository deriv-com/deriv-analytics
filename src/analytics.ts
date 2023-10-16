import { AttributesTypes, Growthbook } from './growthbook'
import { RudderStack, } from './rudderstack'
import { TEvents } from './types'
type AnalyticsData<T extends keyof TEvents> = { event: T } & TEvents[T]
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

    const setAttributes = ( { country,  user_language, device_language, device_type }: AttributesTypes) => {
        _growthbook.setAttributes({
            id: getId(),
            country,
            user_language,
            device_language,
            device_type,
        })
    }

    const getFeatureState = (id: string) => _growthbook.getFeatureState(id)?.experimentResult?.name
    const getFeatureValue = (id: string, defaultValue: string) =>
        _growthbook.getFeatureValue(id, defaultValue)
    const setUrl = (href: string) => _growthbook.setUrl(href)
    const getId = () => _rudderstack.getUserId() || _rudderstack.getAnonymousId()
    const track = <T extends keyof TEvents>(
        action: TEvents[T]['action'],
        analyticsData: AnalyticsData<T>,
    ) => {
        _rudderstack.track(analyticsData.event, {
            ...analyticsData, action
        })
    }

    const analyticsData: Parameters<typeof track>[1] = {event: 'ce_virtual_signup_email_confirmation', signup_provider: 'email'}
    track('open', analyticsData)

    const getInstances = () => ({ ab: _growthbook, tracking: _rudderstack })

    return {
        initialise,
        setAttributes,
        getFeatureState,
        getFeatureValue,
        setUrl,
        getId,
        track,
        getInstances,
    }
}

export const Analytics = createAnalyticsInstance()
