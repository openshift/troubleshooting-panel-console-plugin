# Openshift Troubleshooting Panel Console Plugin - AI Agent Guide

## Project Overview
A frontend plugin to the OpenShit Console of the [Korrel8r](https://github.com/korrel8r/korrel8r) project, which looks to display a connected web of observability nodes/signals and navigate to them on selection.

## External Dependencies & Operators

| System | Repository | Purpose |
|--------|------------|---------|
| COO | https://github.com/rhobs/observability-operator | Manages troubleshooting-panel-console-plugin |
| Korrel8r | https://github.com/korrel8r/korrel8r | Correlation backend |
| Console SDK | https://github.com/openshift/console | Plugin framework |

### COO (Cluster Observability Operator)
COO is the downstream OpenShift build of the observability-operator project, providing optional observability configuration and features to a kubernetes cluster. In order to deploy the troubleshooting-panel and korrel8r, a UIPlugin with the type of `TroubleshootingPanel` can be created. COO can take the state of the cluster (such as the OCP version) and information set in the UIPlugin to pass in a set of features or configuration values to the troubleshooting-panel backend. Currently there aren't any features or configuration values used.


- **UIPlugin CR example**:
```yaml
apiVersion: observability.openshift.io/v1alpha1
kind: UIPlugin
metadata:
  name: troubleshooting-panel
spec:
  type: TroubleshootingPanel
```

### Korrel8r
Korrel8r is a rule based correlation engine, with an extensible rule set, that can navigate:
- many types of signal and resource data
- using diverse schema, data models and naming conventions
- queried using diverse query languages
- stored in multiple stores with diverse query APIs

Each type of signal or resource is represented by a "domain". Korrel8r can be extended to handle new signals and resources by adding new domains.

Relationships within and between domains are expressed as "rules".

The full documentation for Korrel8r can be found here:
https://korrel8r.github.io/korrel8r/

### Console Plugin Framework
The OpenShift Console uses a frontend plugin system powered by Webpack's Module Fedaration. Upon reconciling the UIPlugin, COO will create a ConsolePlugin CR which will enable a route for OpenShift console users to make requests to the troubleshooting-panel pod. The OpenShift Console will first load a `plugin-manifest.json` which is rendered from the `./web/console-extensions.json` file durring build time, and then use the information within it to dynamically load needed chunks of the built js to the frontend.

The OpenShift console provides an npm SDK package which is tied to the OCP version it is built for. The package tries to retain compatability as much as possible, so a single build is able to be used across multiple OCP versions, with specific versions (such as 4.19 and the unreleased 4.22) breaking backwards compatability. 

## Development Guide
The troubleshooting-panel repo's code is split up into 2 general areas:
- golang backend - `./cmd` and `./pkg` folders
- frontend components - `./web`

All commands should be routed through the `Makefile`.

### Frontend
The troubelshooting-panel uses the following technologies:
- typescript
- react 17
- i18next
- redux

#### i18next
When working with i18next the react hook should contain the troubleshooting panels namespace, and each piece of static text should be wrapped in the returned translation function. After adding a new tranlated text, make sure to run `make build-frontend` which will regenerate the translation files.

```ts
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  return <div>{`t('Korrel8r')`}</div>
```

### Backend
The troubelshooting-panel uses the following technologies:
- go
- gorilla/mux

### Console Plugin Framework:
- Dynamic Plugin: https://github.com/openshift/enhancements/blob/master/enhancements/console/dynamic-plugins.md
- Plugin SDK README: https://github.com/openshift/console/blob/main/frontend/packages/console-dynamic-plugin-sdk/README.md
- Plugin SDK API: https://github.com/openshift/console/blob/main/frontend/packages/console-dynamic-plugin-sdk/docs/api.md
- Extensions docs: https://github.com/openshift/console/blob/main/frontend/packages/console-dynamic-plugin-sdk/docs/console-extensions.md
- Example plugin: https://github.com/openshift/console/tree/main/dynamic-demo-plugin

In the event that a new console-extension point is needed which is only available when a specific feature is enabled, the `openshift/monitoring-plugin` can be used as an implementation refrence:

For reference for adding console extension points or features:
https://github.com/openshift/monitoring-plugin/tree/main/pkg

### Korrel8r

The Korrel8r API client is built off of the swagger documentation for the upstream project. Updating the API client can be accomplished by copying the `swagger.json` file from the upstream project, located [here](https://github.com/korrel8r/korrel8r/blob/main/pkg/rest/docs/swagger.json), and then running `make gen-client`.

#### Openshift Domain's Location
After determing which domains, signals and queries are connected from querying the perses backend, we then need to convert the korrel8r responses into OpenShift URL's so that we can match the current page and locate related pages to navigate to. These conversions are located in `./web/src/korrel8r`. These URL conversions MUST be kept accurate and have extensive unit tests located in `./web/src/__tests__`.

### Development Setup
- See README.md for full setup
- Deployment of COO and other resources: https://github.com/observability-ui/development-tools/

## Release & Testing

### Before submitting a PR run the following and address any errors:
```bash
make build-frontend
make test-frontend
```

### PR Requirements:
- **Title format**: `[JIRA_ISSUE]: Description`
- **Testing**: All linting and tests must pass
- **Translations**: Ensure i18next keys are properly added by ensuring any static text in the frontend is wrapped in a useTranslation function call, ie. `t('Korrel8r')`

### Commit Requirements:
- **Title format**: Conventional Commit format ([link](https://www.conventionalcommits.org/en/v1.0.0/))

---
*This guide is optimized for AI agents and developers. For detailed setup instructions, also refer to README.md and Makefile.*
