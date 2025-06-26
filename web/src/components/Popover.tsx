import * as React from 'react';
import Korrel8rPanel from './Korrel8rPanel';
import './popover.css';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Title, Flex, FlexItem } from '@patternfly/react-core';
import { TimesCircleIcon } from '@patternfly/react-icons';
import { State } from '../redux-reducers';
import { closeTP } from '../redux-actions';
import { useTranslation } from 'react-i18next';
import { useActivePerspective } from '@openshift-console/dynamic-plugin-sdk';

export default function Popover() {
  const dispatch = useDispatch();
  const [activePerspective] = useActivePerspective();
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');

  const isOpen = useSelector((state: State) => state.plugins?.tp?.get('isOpen'));

  const close = React.useCallback(() => {
    dispatch(closeTP());
  }, [dispatch]);

  React.useEffect(() => {
    if (activePerspective !== 'admin' && isOpen) {
      close();
    }
  }, [activePerspective, isOpen, close]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <Flex
        className="tp-plugin__popover"
        direction={{ default: 'column' }}
        gap={{ default: 'gapNone' }}
      >
        <Flex className="tp-plugin__popover-title-bar" gap={{ default: 'gapNone' }}>
          <FlexItem grow={{ default: 'grow' }}>
            <Title headingLevel="h1">{t('Troubleshooting')}</Title>
            <p>{t('Find related resources.')}</p>
          </FlexItem>
          <FlexItem>
            <Button variant="plain" aria-label="Close" onClick={close}>
              <TimesCircleIcon className="tp-plugin__popover-close" />
            </Button>
          </FlexItem>
        </Flex>
        <Flex
          className="tp-plugin__popover-content"
          direction={{ default: 'column' }}
          grow={{ default: 'grow' }}
          gap={{ default: 'gapNone' }}
        >
          <Korrel8rPanel />
        </Flex>
      </Flex>
    </>
  );
}
