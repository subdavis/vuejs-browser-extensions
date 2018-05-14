var path = require('path')
var webpack = require('webpack')

module.exports = {
    entry: {
        'index': './index.js'
    },
    output: {
        publicPath: '/build/',
        path: path.resolve(__dirname, './build'),
        filename: '[name].build.js'
    },
    module: {
        rules: [{
            test: /\.vue$/,
            loader: 'vue-loader',
            options: {
                loaders: {
                    // Since sass-loader (weirdly) has SCSS as its default parse mode, we map
                    // the "scss" and "sass" values for the lang attribute to the right configs here.
                    // other preprocessors should work out of the box, no loader config like this necessary.
                    'scss': [
                        'vue-style-loader',
                        'css-loader',
                        'sass-loader'
                    ],
                    'sass': [
                        'vue-style-loader',
                        'css-loader',
                        'sass-loader?indentedSyntax'
                    ],
                    'css': [
                        'css-loader'
                    ]
                }
                // other vue-loader options go here
            }
        }, {
            test: /\.js$/,
            loader: 'babel-loader',
        }]
    },
    performance: {
        hints: false
    },
    devtool: undefined
}