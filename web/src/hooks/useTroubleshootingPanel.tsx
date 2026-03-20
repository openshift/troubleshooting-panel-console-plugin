import { Action, ExtensionHook, useActivePerspective } from '@openshift-console/dynamic-plugin-sdk';
import { InfrastructureIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { openTP } from '../redux-actions';
import { replaceTraceStore } from '../korrel8r-client';
import { extractTraceContext, buildTraceStoreConfig } from '../utils/traceStoreUtils';
import { useKorrel8r } from './useKorrel8r';

const useTroubleshootingPanel: ExtensionHook<Array<Action>> = () => {
  const { isKorrel8rReachable } = useKorrel8r();
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const [perspective] = useActivePerspective();
  const dispatch = useDispatch();
  const open = React.useCallback(async () => {
    // Check if we're on a traces page with tenant information
    const traceContext = extractTraceContext();

    if (traceContext) {
      try {
        // Update korrel8r's trace store to match the selected tenant
        const storeConfig = buildTraceStoreConfig(traceContext);
        await replaceTraceStore(storeConfig);
        // eslint-disable-next-line no-console
        console.log('Trace store updated for tenant:', traceContext.tenant);
      } catch (error) {
        // Log error but don't block panel from opening
        // The panel will still work with other domains even if trace store update fails
        // eslint-disable-next-line no-console
        console.error('Failed to update trace store:', error);
      }
    }

    dispatch(openTP());
  }, [dispatch]);

  const getActions = React.useCallback(() => {
    if (!isKorrel8rReachable || perspective === 'dev') {
      return [];
    }
    const actions = [
      {
        id: 'open-troubleshooting-panel',
        label: (
          <div title={t('Open the Troubleshooting Panel')}>
            <InfrastructureIcon /> {t('Troubleshooting Panel')}
          </div>
        ),
        description: t('Open the Troubleshooting Panel'),
        cta: open,
        disabled: false,
        tooltip: t('Open the Troubleshooting Panel'),
      },
    ];
    return actions;
  }, [open, t, isKorrel8rReachable, perspective]);

  const [actions, setActions] = React.useState<Array<Action>>(getActions());

  React.useEffect(() => {
    setActions(getActions());
  }, [open, getActions]);

  return [actions, true, null];
};

export default useTroubleshootingPanel;
