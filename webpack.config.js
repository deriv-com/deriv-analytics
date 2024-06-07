const path = require('path')

module.exports = {
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'analytics.bundle.js',
        library: 'Analytics',
        libraryTarget: 'umd', // This makes your bundle available as a UMD module
        globalObject: 'this', // Necessary for UMD to work properly
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
}
