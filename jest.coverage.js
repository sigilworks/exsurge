const baseConfig = require('./jest.config.js');

module.exports = {
    ...baseConfig,
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.js',
        // '!src/**/index.js'
    ],
    coverageReporters: ['html', 'text', 'text-summary'],
    coverageThreshold: {
        global: {
            statements: 80,
            branches: 80,
            functions: 80,
            lines: 80
        }
    }
};
