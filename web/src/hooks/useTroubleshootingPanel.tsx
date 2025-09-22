import { Action, ExtensionHook, useActivePerspective } from '@openshift-console/dynamic-plugin-sdk';
import { InfrastructureIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { openTP } from '../redux-actions';
import { useKorrel8r } from './useKorrel8r';

const useTroubleshootingPanel: ExtensionHook<Array<Action>> = () => {
  const { isKorrel8rReachable } = useKorrel8r();
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const [perspective] = useActivePerspective();
  const dispatch = useDispatch();
  const open = React.useCallback(() => {
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
