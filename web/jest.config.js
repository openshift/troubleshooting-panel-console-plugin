/* eslint-disable no-undef */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Needed for tests that use localStorage
  transform: {
    // Supress annoying test warning about "esModuleInterop", we don't want to set this true.
    '\\.[jt]sx?$': ['ts-jest', { diagnostics: { ignoreCodes: ['TS151001'] } }],
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!(@openshift-console|@patternfly))'],
  coverageDirectory: '<rootDir>/coverage/cov-jest',
};
