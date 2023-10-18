import { createAnalyticsInstance } from '../src/analytics';

describe('createAnalyticsInstance happened', () => {
    const options = {
        growthbookKey: 'test_growthbook_key',
        growthbookDecryptionKey: 'test_decryption_key',
        rudderstackKey: 'test_rudderstack_key',
        enableDevMode: true,
    };

    it('should create an analytics instance', () => {
        const analytics = createAnalyticsInstance(options);
        expect(analytics).toHaveProperty('initialise');
        expect(analytics).toHaveProperty('setAttributes');
        expect(analytics).toHaveProperty('getFeatureState');
        expect(analytics).toHaveProperty('getFeatureValue');
        expect(analytics).toHaveProperty('setUrl');
        expect(analytics).toHaveProperty('getId');
        expect(analytics).toHaveProperty('trackEvent');
        expect(analytics).toHaveProperty('getInstances');
    });
});