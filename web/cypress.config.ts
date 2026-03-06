import { defineConfig } from 'cypress';
import path from 'path';
import fs from 'fs';

// Plugins
import registerCodeCoverage from '@cypress/code-coverage/task';
import cypressGrepPlugin from '@cypress/grep/src/plugin';

const reportDir = process.env.ARTIFACT_DIR || '/tmp';

export default defineConfig({
  // --- General Settings ---
  fixturesFolder: 'fixtures',
  defaultCommandTimeout: 30000,
  viewportWidth: 1600,
  viewportHeight: 1200,
  retries: {
    runMode: 0,
    openMode: 0,
  },

  // --- Artifacts & Reporting ---
  screenshotsFolder: path.join(reportDir, 'cypress', 'screenshots'),
  screenshotOnRunFailure: true,
  trashAssetsBeforeRuns: true,
  videosFolder: path.join(reportDir, 'cypress', 'videos'),
  video: true,
  videoCompression: false,

  reporter: './node_modules/cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'mocha-junit-reporter, mochawesome',
    mochaJunitReporterReporterOptions: {
      mochaFile: path.join(reportDir, 'junit_cypress-[hash].xml'),
      toConsole: false,
    },
    mochawesomeReporterOptions: {
      reportDir: reportDir,
      reportFilename: 'cypress_report',
      overwrite: false,
      html: false,
      json: true,
    },
  },

  // --- Environment Variables ---
  env: {
    grepFilterSpecs: false,
    KUBECONFIG_PATH: process.env.KUBECONFIG,
    OPENSHIFT_VERSION: process.env.CYPRESS_OPENSHIFT_VERSION,
    OPENSHIFT_LOGGING_ENABLED: process.env.CYPRESS_OPENSHIFT_LOGGING_ENABLED === 'true',
    OPENSHIFT_TRACING_ENABLED: process.env.CYPRESS_OPENSHIFT_TRACING_ENABLED === 'false',
    OPENSHIFT_NETOBS_ENABLED: process.env.CYPRESS_OPENSHIFT_NETOBS_ENABLED === 'false',
  },

  // --- E2E Specific Configuration ---
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || process.env.BASE_URL || 'http://localhost:9003',
    pageLoadTimeout: 300000, // 5 minutes
    supportFile: './cypress/support/e2e.ts',
    specPattern: './cypress/e2e/*.cy.{js,jsx,ts,tsx}',
    testIsolation: false,
    numTestsKeptInMemory: 1,

    // Experimental Features
    experimentalModifyObstructiveThirdPartyCode: true,
    experimentalOriginDependencies: true,
    experimentalMemoryManagement: true,
    experimentalCspAllowList: ['default-src', 'script-src'],

    setupNodeEvents(on, config) {
      // --- Register Plugins ---
      registerCodeCoverage(on, config);
      cypressGrepPlugin(config);

      // --- Browser Launch ---
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.args.push('--enable-precise-memory-info');
        }
        return launchOptions;
      });

      // --- Custom Tasks ---
      on('task', {
        log: (msg) => { console.log(msg); return null; },
        logError: (msg) => { console.error(msg); return null; },
        logTable: (data) => { console.table(data); return null; },
        readFileIfExists: (filename) => fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : null,
      });

      // --- Screenshot Rename Logic ---
      on('after:screenshot', async (details) => {
        const pathObj = path.parse(details.path);
        const timestamp = Date.now();
        const newPath = path.join(pathObj.dir, `${timestamp}_${pathObj.base}`);
        await fs.promises.rename(details.path, newPath);
        return { path: newPath };
      });

      // --- Video Cleanup ---
      on('after:spec', (spec, results) => {
        if (results?.video) {
          const hasFailures = results.tests?.some((test) =>
            test.attempts.some((attempt) => attempt.state === 'failed')
          );
          if (!hasFailures && fs.existsSync(results.video)) {
            fs.unlinkSync(results.video);
          }
        }
      });

      return config;
    },
  },
});
