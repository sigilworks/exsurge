const _ = require('lodash');
const [ webpackConfig ] = require('./webpack.config');

const alias = webpackConfig.resolve.alias;
const moduleNameMapper = _.reduce(alias, (acc, path, aliasName) => {
    // modify the webpack paths to match the preferred format for jest
    acc[`^${aliasName}(.*)$`] = `${path.replace(__dirname, '<rootDir>')}$1`;
    return acc;
}, {
    '\\.(css|less)$': '<rootDir>/test/style.mock.js'
});

module.exports = {
    moduleNameMapper,
    testPathIgnorePatterns: [
        '/node_modules/'
    ],
    testURL: 'http://localhost/',
    transformIgnorePatterns: [
        '/node_modules/'
    ],
    testMatch: [
        '<rootDir>/test/**/*.spec.js'
    ],
    roots: [
        '<rootDir>/src/', '<rootDir>/test/'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/index.js'
    ],
    watchPlugins: [
        'jest-watch-typeahead/filename',
        'jest-watch-typeahead/testname',
    ],
    setupFiles: ['<rootDir>/test/shim.js'],
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js']
};

