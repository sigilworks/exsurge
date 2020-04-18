const path = require('path');

const isDevelopment = ['development', 'test', 'local'].includes(process.env.NODE_ENV);

module.exports = {
    context: path.join(__dirname, './'),
    entry: path.join(__dirname, './src/index.js'),
    mode: isDevelopment ? 'development' : 'production',
    devtool: 'source-map',
    target: 'web',
    output: {
        path: path.join(__dirname, './dist'),
        filename: 'exsurge.js',
        library: 'exsurge',
        libraryTarget: 'umd',
        pathinfo: true,
        umdNamedDefine: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: 'babel-loader'
            },
            {
                test: /\.(otf|svg)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 30000,
                            encoding: 'utf8'
                        },
                    },
                ],
            },
        ]
    },
    resolve: {
        modules: ['node_modules'],
        alias: {
            chant: path.resolve(__dirname, './src/chant'),
            elements: path.resolve(__dirname, './src/elements'),
            gabc: path.resolve(__dirname, './src/gabc'),
            language: path.resolve(__dirname, './src/language'),
            utils: path.resolve(__dirname, './src/utils')
        }
    },
    plugins: []
};
