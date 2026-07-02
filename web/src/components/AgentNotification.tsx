import { Alert, AlertActionCloseButton, AlertGroup } from '@patternfly/react-core';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { setAgentNotification } from '../redux-actions';
import { State } from '../redux-reducers';
import { AIExperienceIcon } from './AIExperienceIcon';

const DISMISS_MS = 3000;

const AgentNotification = () => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const dispatch = useDispatch();
  const message: string = useSelector((s: State) => s.plugins?.tp?.get('agentNotification'));
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = () => {
    clearTimeout(timer.current);
    dispatch(setAgentNotification(''));
  };

  useEffect(() => {
    if (message) {
      timer.current = setTimeout(() => dispatch(setAgentNotification('')), DISMISS_MS);
      return () => clearTimeout(timer.current);
    }
  }, [message, dispatch]);

  if (!message) return null;

  return (
    <AlertGroup isToast isLiveRegion style={{ zIndex: 1060 }}>
      <Alert
        variant="info"
        title={t('AI agent navigation')}
        customIcon={<AIExperienceIcon />}
        actionClose={<AlertActionCloseButton onClose={dismiss} />}
      >
        {message}
      </Alert>
    </AlertGroup>
  );
};

export default AgentNotification;
