import { defineConfig } from 'cypress';
import plugin from './plugins/index';

export default defineConfig({
  viewportWidth: 1920,
  viewportHeight: 1080,
  screenshotsFolder: './screenshots',
  videosFolder: './videos',
  video: true,
  reporter: '../../node_modules/cypress-multi-reporters',
  reporterOptions: {
    configFile: 'reporter-config.json',
  },
  fixturesFolder: 'fixtures',
  defaultCommandTimeout: 30000,
  retries: {
    runMode: 1,
    openMode: 0,
  },
  e2e: {
    setupNodeEvents(on, config) {
      return plugin(on, config);
    },
    specPattern: 'tests/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false,
  },
});
