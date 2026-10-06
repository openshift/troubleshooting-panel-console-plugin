# Cypress E2E Testing Guide

This document provides comprehensive information about the Cypress end-to-end testing setup for the OpenShift Console Troubleshooting Panel Plugin.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Custom Commands](#custom-commands)
- [Environment Variables](#environment-variables)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The Cypress test suite validates the Troubleshooting Panel plugin functionality within an OpenShift Console environment. Tests are written in TypeScript and utilize custom commands for common operations.

**Key Features:**
- TypeScript support
- Custom authentication commands
- OpenShift-specific helpers
- Code coverage reporting
- Video recording on test failures
- Tag-based test filtering
- Multi-reporter output (JUnit, Mochawesome)

## Prerequisites

Before running Cypress tests, ensure you have:

1. **Node.js and npm** - Required for Cypress and dependencies
2. **OpenShift Cluster** - A running OpenShift 4.16+ cluster
3. **oc CLI** - OpenShift command-line tool
4. **KUBECONFIG** - Valid kubeconfig with cluster access
5. **COO (Cluster Observability Operator)** - Installed in the cluster
6. **Troubleshooting Panel Plugin** - Deployed via UIPlugin CR

### Required Cluster Components

- **Observability Operator** - Must be running
- **Korrel8r** - Backend correlation engine
- **Console** - OpenShift Console accessible

## Installation

### 1. Install Dependencies

From the `web` directory:

```bash
cd web
npm install
```

Or from the project root:

```bash
make install-frontend
```

### 2. Deploy the Troubleshooting Panel

The test script will automatically create the UIPlugin CR if it doesn't exist, but you can manually deploy it:

```yaml
apiVersion: observability.openshift.io/v1alpha1
kind: UIPlugin
metadata:
  name: troubleshooting-panel
spec:
  type: TroubleshootingPanel
```

Apply with:
```bash
oc apply -f <filename>.yaml
```

## Configuration

### Cypress Configuration File

The main configuration is located at `web/cypress.config.ts`. Key settings include:

```typescript
{
  // Timeouts
  defaultCommandTimeout: 30000,
  pageLoadTimeout: 300000, // 5 minutes
  
  // Viewport
  viewportWidth: 1600,
  viewportHeight: 1200,
  
  // Artifacts
  video: true,
  screenshotOnRunFailure: true,
  
  // Base URL (auto-configured from cluster)
  baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:9003'
}
```

### TypeScript Configuration

TypeScript settings for Cypress are in `web/cypress/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2018",
    "lib": ["es2018", "dom"],
    "types": ["cypress", "node"]
  }
}
```

## Running Tests

### Quick Start

From the project root:

```bash
make test-e2e
```

This command:
1. Installs npm dependencies
2. Runs the `web/scripts/run-e2e.sh` script
3. Automatically configures authentication and cluster connection
4. Executes all test specs

### Manual Test Execution

From the `web` directory:

```bash
# Run all tests in headless mode
npx cypress run --e2e

# Run specific test file
npx cypress run --e2e --spec "cypress/e2e/acceptance.cy.ts"

# Open Cypress Test Runner (interactive mode)
npx cypress open --e2e

# Run tests with specific tag
npx cypress run --e2e --env grep=@smoke
```

### Running with Custom Environment

```bash
# Set required environment variables
export KUBECONFIG=/path/to/kubeconfig
export CYPRESS_BASE_URL="https://console-openshift-console.apps.mycluster.com"
export CYPRESS_LOGIN_IDP="my-idp"
export CYPRESS_LOGIN_USERS="user1:pass1,user2:pass2"
export CYPRESS_OPENSHIFT_VERSION="4.19"

# Run tests
cd web && npm run test:e2e
```

## Test Structure

### Directory Layout

```
web/cypress/
├── e2e/                      # Test specifications
│   └── acceptance.cy.ts      # Main acceptance tests
├── fixtures/                 # Test data and selectors
│   └── data-test.ts         # Data-test selectors and classes
├── support/                  # Support files and commands
│   ├── commands/            # Custom Cypress commands
│   │   ├── auth-commands.ts      # Authentication helpers
│   │   ├── selector-commands.ts  # Element selection helpers
│   │   ├── utility-commands.ts   # General utilities
│   │   ├── troubeshoot-commands.ts # Panel-specific commands
│   │   └── env.ts               # Environment configuration
│   └── e2e.ts               # Global setup and hooks
├── views/                    # Page object models
│   ├── nav.ts               # Navigation helpers
│   ├── tour.ts              # Guided tour helpers
│   └── utils.ts             # View utilities
├── tsconfig.json            # TypeScript configuration
└── cypress.config.ts        # Cypress configuration
```

### Test File Example

```typescript
import * as dt from '../fixtures/data-test'

describe('TroubleshootPanel Test', { tags: ['@admin'] }, () => {
  before(() => {
    cy.uiLoginAsClusterAdminForUser("first");
    cy.openTroubleshootPanel();
  });

  after(() => {
    cy.closeTroubleshootPanel();
    cy.uiLogoutClusterAdminForUser("first");
  });
  
  it('Essential elements validation', { tags: ['@smoke'] }, () => {
    cy.clickNavLink(['Observe', 'Alerting']);
    cy.openTroubleshootPanel();
    
    cy.get(dt.Classes.TroubleShootPanelPopoverTitleBar)
      .should('exist')
      .within(() => {
        cy.contains('h1', 'Troubleshooting');
      });
  });
});
```

## Custom Commands

### Authentication Commands

Located in `cypress/support/commands/auth-commands.ts`:

```typescript
// Login as admin for a specific user index
cy.uiLoginAsClusterAdminForUser("first")

// Login as regular user
cy.uiLoginAsUser("first")

// Logout
cy.uiLogoutClusterAdminForUser("first")

// CLI login
cy.cliLogin(username, password, hostapi)

// Execute admin CLI command
cy.adminCLI("oc get pods")
```

### Troubleshooting Panel Commands

Located in `cypress/support/commands/troubeshoot-commands.ts`:

```typescript
// Open the troubleshooting panel
cy.openTroubleshootPanel()

// Close the panel
cy.closeTroubleshootPanel()

// Focus the panel on current context
cy.focusTroubleshootPanel()

// Refresh panel data
cy.refreshTroubleshootPanel()

// Open advanced search
cy.clickTroubleshootPanelAdvance()

// Get query text
cy.getTroubleshootPanelQueryText()
```

### Navigation Commands

Located in `cypress/support/commands/selector-commands.ts`:

```typescript
// Navigate through console menu
cy.clickNavLink(['Observe', 'Alerting'])

// Find by test ID
cy.byLegacyTestID('test-id')

// Find by button text
cy.byButtonText('Signal Correlation')
```

### Utility Commands

Located in `cypress/support/commands/utility-commands.ts`:

```typescript
// Custom logging
cy.task('log', 'Custom message')
cy.task('logError', 'Error message')
cy.task('logTable', tableData)

// Read file if exists
cy.task('readFileIfExists', '/path/to/file')
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `KUBECONFIG` | Path to kubeconfig file | `/home/user/.kube/config` |
| `CYPRESS_BASE_URL` | OpenShift Console URL | `https://console-openshift-console.apps...` |
| `CYPRESS_LOGIN_IDP` | Identity provider name | `uiauto-htpasswd-idp` |
| `CYPRESS_LOGIN_USERS` | Comma-separated user:pass pairs | `user1:pass1,user2:pass2` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CYPRESS_OPENSHIFT_VERSION` | OpenShift version | Auto-detected |
| `CYPRESS_SPEC` | Test specs to run | All `cypress/e2e/*.ts` |
| `CYPRESS_TAG` | Filter tests by tag | None |
| `CYPRESS_OPENSHIFT_LOGGING_ENABLED` | Logging feature flag | `true` |
| `CYPRESS_OPENSHIFT_TRACING_ENABLED` | Tracing feature flag | `false` |
| `CYPRESS_OPENSHIFT_NETOBS_ENABLED` | Network observability flag | `false` |
| `ARTIFACT_DIR` | Directory for artifacts | `/tmp` |

### Setting Variables

The `run-e2e.sh` script automatically configures most variables by:
1. Creating an htpasswd IDP with test users (if not provided)
2. Detecting the console route URL
3. Detecting OpenShift version
4. Exporting environment variables for Cypress

## Writing Tests

### Best Practices

1. **Use Data Test Selectors**: Import from `fixtures/data-test.ts`
   ```typescript
   import * as dt from '../fixtures/data-test'
   cy.get(dt.Classes.TroubleShootPanelPopover)
   ```

2. **Tag Your Tests**: Use tags for filtering
   ```typescript
   describe('Test Suite', { tags: ['@admin'] }, () => {
     it('Test case', { tags: ['@smoke'] }, () => {
       // Test implementation
     });
   });
   ```

3. **Use Custom Commands**: Leverage existing commands
   ```typescript
   cy.openTroubleshootPanel()  // Instead of manual clicks
   ```

4. **Handle Asynchronous Operations**: Use proper waits
   ```typescript
   cy.wait(30000)  // For long-running operations
   cy.get(selector).should('be.visible')
   ```

5. **Clean Up After Tests**: Use `after` hooks
   ```typescript
   after(() => {
     cy.closeTroubleshootPanel()
     cy.uiLogoutClusterAdminForUser("first")
   })
   ```

### Test Isolation

Test isolation is **disabled** (`testIsolation: false`) to maintain state between tests. Be mindful of:
- Login state persists
- Panel state may carry over
- Explicit cleanup in `after` hooks is important

### Tag-Based Filtering

Run specific test categories:

```bash
# Run only smoke tests
CYPRESS_TAG="@smoke" npm run test:e2e

# Run only admin tests
CYPRESS_TAG="@admin" npm run test:e2e

# Run multiple tags (AND logic)
npx cypress run --e2e --env grep="@smoke+@admin"

# Run either tag (OR logic)
npx cypress run --e2e --env grep="@smoke,@admin"
```

## CI/CD Integration

### Artifacts & Reporting

The test suite generates multiple artifacts for CI/CD pipelines:

**Screenshots**: Captured on test failure
- Location: `${ARTIFACT_DIR}/cypress/screenshots/`
- Format: `{timestamp}_{test-name}.png`

**Videos**: Recorded during test runs (only kept on failure)
- Location: `${ARTIFACT_DIR}/cypress/videos/`
- Compression: Disabled for faster processing

**JUnit XML**: For CI integration
- Location: `${ARTIFACT_DIR}/junit_cypress-[hash].xml`
- Reporter: `mocha-junit-reporter`

**Mochawesome JSON**: For HTML reports
- Location: `${ARTIFACT_DIR}/cypress_report.json`
- Reporter: `mochawesome`

### CI Environment Example

```yaml
# Example CI configuration
env:
  KUBECONFIG: /path/to/kubeconfig
  ARTIFACT_DIR: /tmp/cypress-artifacts
  CYPRESS_SPEC: "cypress/e2e/acceptance.cy.ts"
  CYPRESS_TAG: "@smoke"

script:
  - make test-e2e
```

### Generating HTML Reports

After test execution:

```bash
# Merge multiple mochawesome JSON files
npx mochawesome-merge "${ARTIFACT_DIR}/cypress_report*.json" > merged.json

# Generate HTML report
npx mochawesome-report-generator merged.json --reportDir ${ARTIFACT_DIR}
```

## Troubleshooting

### Common Issues

#### 1. Tests Fail to Start

**Problem**: Cypress cannot connect to the cluster

**Solution**:
- Verify `KUBECONFIG` is set and valid: `oc whoami`
- Check cluster connectivity: `oc get nodes`
- Verify console route: `oc get route console -n openshift-console`

#### 2. Authentication Failures

**Problem**: Cannot login to OpenShift Console

**Solution**:
- Verify IDP exists: `oc get oauth cluster -o yaml`
- Check user credentials are correct
- Manually test login: `oc login -u <user> -p <pass>`
- Review IDP setup in `run-e2e.sh` script

#### 3. Panel Does Not Open

**Problem**: Troubleshooting panel fails to appear

**Solution**:
- Check UIPlugin is created: `oc get uiplugin troubleshooting-panel`
- Verify observability-operator is running:
  ```bash
  oc get pod -l app.kubernetes.io/name=observability-operator -A
  ```
- Check plugin pod status:
  ```bash
  oc get pods -n openshift-observability-ui-troubleshooting-panel
  ```
- Clear browser cache and retry

#### 4. Timeout Errors

**Problem**: Commands timeout waiting for elements

**Solution**:
- Increase timeouts in `cypress.config.ts`
- Check network latency to cluster
- Verify cluster resources aren't constrained
- Review browser console for errors

#### 5. Memory Issues

**Problem**: Tests crash with memory errors

**Solution**:
- Experimental memory management is enabled in config
- Limit tests kept in memory: `numTestsKeptInMemory: 1`
- Run fewer specs in parallel
- Close Cypress UI when running headless

#### 6. Video/Screenshot Artifacts Missing

**Problem**: Artifacts not saved

**Solution**:
- Verify `ARTIFACT_DIR` exists and is writable
- Check disk space: `df -h $ARTIFACT_DIR`
- Review Cypress config for artifact paths
- Videos are deleted on passing tests (intentional)

### Debug Mode

Enable verbose logging:

```bash
# Cypress debug logs
DEBUG=cypress:* npx cypress run --e2e

# Browser console logs
npx cypress run --e2e --browser chrome --headed

# Custom task logging
cy.task('log', 'Debug checkpoint reached')
cy.task('logTable', { key: 'value', debug: true })
```

### Interactive Debugging

Open Cypress Test Runner for step-by-step debugging:

```bash
cd web
npx cypress open --e2e
```

This allows:
- Stepping through tests
- Inspecting DOM state
- Reviewing network requests
- Time-travel debugging with snapshots

### Retry Logic

The config includes retry settings:

```typescript
retries: {
  runMode: 0,    // CI mode retries
  openMode: 0,   // Interactive mode retries
}
```

To enable retries for flaky tests, increase these values.

### Error Suppression

Some benign errors are automatically suppressed (see `cypress/support/e2e.ts`):
- ResizeObserver loop errors
- Transient React errors
- Expected API authorization errors

If you see unexpected test passes, check the suppression list.

## Additional Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [OpenShift Console Plugin SDK](https://github.com/openshift/console/tree/main/frontend/packages/console-dynamic-plugin-sdk)
- [Korrel8r Documentation](https://korrel8r.github.io/korrel8r/)
- [Observability Operator](https://github.com/rhobs/observability-operator)

## Contributing

When adding new tests:

1. **Follow naming conventions**: `{feature}.cy.ts`
2. **Add appropriate tags**: `@smoke`, `@admin`, `@regression`
3. **Update data-test fixtures**: Add selectors to `fixtures/data-test.ts`
4. **Create reusable commands**: For repeated operations
5. **Document environment needs**: Update this README if new setup is required

## Support

For issues related to:
- **Cypress framework**: Check Cypress documentation
- **Test failures**: Review artifacts in `$ARTIFACT_DIR`
- **Cluster issues**: Verify OpenShift and operator status
- **Plugin issues**: Check troubleshooting-panel pod logs

---

**Last Updated**: 2026-10-06
**Cypress Version**: 14.5.4
**Supported OpenShift Versions**: 4.19+
