import {
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Icon,
  Label,
  MenuToggle,
  MenuToggleElement,
  Switch,
} from '@patternfly/react-core';
import { Ref, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { setAgentEnabled } from '../redux-actions';
import { State } from '../redux-reducers';
import { AIExperienceIcon } from './AIExperienceIcon';
import { HelpPopover } from './HelpPopover';

const AgentMenu = () => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);

  const agentEnabled: boolean = useSelector((s: State) => s.plugins?.tp?.get('agentEnabled'));
  const agentError: string = useSelector((s: State) => s.plugins?.tp?.get('agentError'));
  const status = agentError ? 'warning' : undefined;

  useEffect(() => {
    if (agentError) {
      // eslint-disable-next-line no-console
      console.error('Agent navigation error:', agentError);
    }
  }, [agentError]);
  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      popperProps={{ position: 'end' }}
      toggle={(toggleRef: Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          variant="plain"
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          aria-label={t('AI Agent settings')}
        >
          <Icon status={status}>
            <AIExperienceIcon />
          </Icon>
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem key="header">
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem grow={{ default: 'grow' }}>
              <Switch
                id="agent-enabled"
                isChecked={agentEnabled}
                hasCheckIcon
                label={t('Agent Navigation')}
                onChange={(_event, checked: boolean) => dispatch(setAgentEnabled(checked))}
              />
              <HelpPopover>
                {t(
                  'Allow an AI agent with your user-id to connect with this console and use it to show you relevant views and correlation searches.',
                )}
              </HelpPopover>
              {!!agentError && <Label status={status}>{t('Connection error')}</Label>}
            </FlexItem>
          </Flex>
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};

export default AgentMenu;
