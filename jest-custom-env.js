const JSDOMEnvironment = require('jest-environment-jsdom').default

class CustomJSDOMEnvironment extends JSDOMEnvironment {
    constructor(config, context) {
        super(config, context)
        // Leave jsdom's location object intact but with a better default URL
    }
}

module.exports = CustomJSDOMEnvironment
