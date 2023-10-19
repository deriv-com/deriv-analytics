import { AttributesTypes, Growthbook } from './growthbook'
import { RudderStack } from './rudderstack'
import { TCoreTrackData, TEvents } from './types'

type Options = {
    growthbookKey: string
    growthbookDecryptionKey: string
    rudderstackKey: string
    enableDevMode: boolean
}

export function createAnalyticsInstance(options?: Options) {
    let _growthbook: Growthbook, _rudderstack: RudderStack

    const initialise = ({ growthbookKey, growthbookDecryptionKey, rudderstackKey, enableDevMode }: Options) => {
        _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey)
        _growthbook = Growthbook.getGrowthBookInstance(growthbookKey, growthbookDecryptionKey, enableDevMode)
    }

    if (options) {
        initialise(options)
    }

    const setAttributes = ({ country, user_language, device_language, device_type }: AttributesTypes) => {
        _growthbook.setAttributes({
            id: getId(),
            country,
            user_language,
            device_language,
            device_type,
        })
    }

    const getFeatureState = (id: string) => _growthbook.getFeatureState(id)?.experimentResult?.name
    const getFeatureValue = (id: string, defaultValue: string) => _growthbook.getFeatureValue(id, defaultValue)
    const setUrl = (href: string) => _growthbook.setUrl(href)
    const getId = () => _rudderstack.getUserId() || _rudderstack.getAnonymousId()

    let coreData = {}
    const setCoreAnalyticsData = (data: TCoreTrackData) => {
        _rudderstack.identifyEvent(getId(), { language: data.language })
        // @ts-ignore
        delete data['language']
        coreData = { ...data }
    }
    /**
     * Pushes page view event to Rudderstack
     *
     * @param curret_page The name or URL of the current page to track the page view event
     */
    const pageView = (current_page: string, platform = 'Deriv App') => {
        _rudderstack.pageView(current_page, platform)
    }

    const trackEvent = <T extends keyof TEvents>(event: T, analyticsData: TEvents[T]) => {
        _rudderstack.track(event, { ...coreData, ...analyticsData })
    }
    const getInstances = () => ({ ab: _growthbook, tracking: _rudderstack })

    return {
        initialise,
        setAttributes,
        setCoreAnalyticsData,
        getFeatureState,
        getFeatureValue,
        setUrl,
        getId,
        trackEvent,
        getInstances,
        pageView,
    }
}

export const Analytics = createAnalyticsInstance()
