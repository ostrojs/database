export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [
        '**/test/**/*.test.ts',
        '**/test/**/*.test.js'
    ],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.json',
                isolatedModules: true,
                diagnostics: false
            }
        ]
    },
    "moduleNameMapper": {
        "^@ostro/database/(.*)$": "<rootDir>/src/$1",
        "^@ostro/database$": "<rootDir>/src/databaseManager"
    },
    "collectCoverage": false,
    "coverageDirectory": "coverage",
    "coverageReporters": [
        "text",
        "lcov",
        "clover"
    ],
    "collectCoverageFrom": [
        "<rootDir>/src/**/*.ts",
        "!<rootDir>/node_modules/**",
        "!<rootDir>/test/**",
        "!<rootDir>/coverage/**",
        "!<rootDir>/build/**",
        "!<rootDir>/jest.config.ts"
    ],
    "modulePathIgnorePatterns": [
        "<rootDir>/build/"
    ]
};
