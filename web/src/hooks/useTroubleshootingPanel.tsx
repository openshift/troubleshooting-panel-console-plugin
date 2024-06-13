import * as React from 'react';
import {
  Action,
  ExtensionHook,
  useActivePerspective,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { InfrastructureIcon } from '@patternfly/react-icons';
import Popover from '../components/Popover';
import { useBoolean } from './useBoolean';
import { useDispatch } from 'react-redux';
import { useKorrel8r } from './useKorrel8r';
import { openTP } from '../redux-actions';
import { useURLState } from './useURLState';
import { useTranslation } from 'react-i18next';

const useTroubleshootingPanel: ExtensionHook<Array<Action>> = () => {
  const { isKorrel8rReachable } = useKorrel8r();
  const { korrel8rQueryFromURL } = useURLState();
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const [perspective] = useActivePerspective();
  const launchModal = useModal();
  const dispatch = useDispatch();
  const [isLaunched, , setLaunched] = useBoolean(false);
  const open = React.useCallback(() => {
    dispatch(openTP());
  }, [dispatch]);

  const getActions = React.useCallback(
    (queryString = '') => {
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
          cta: () => {
            if (!isLaunched && launchModal) {
              launchModal?.(Popover, { queryString });
              setLaunched();
            }
            open();
          },
          disabled: false,
          tooltip: t('Open the Troubleshooting Panel'),
        },
      ];
      return actions;
    },
    [isLaunched, launchModal, open, setLaunched, t, isKorrel8rReachable, perspective],
  );

  const [actions, setActions] = React.useState<Array<Action>>(getActions());

  React.useEffect(() => {
    setActions(getActions(korrel8rQueryFromURL));
  }, [korrel8rQueryFromURL, isLaunched, launchModal, open, setLaunched, getActions]);

  return [actions, true, null];
};

export default useTroubleshootingPanel;
