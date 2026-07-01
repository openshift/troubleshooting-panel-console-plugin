import {
  Dropdown,
  DropdownItem,
  DropdownList,
  Icon,
  Label,
  MenuToggle,
  MenuToggleElement,
  Switch,
} from '@patternfly/react-core';
import { Ref, useState } from 'react';
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

  const status = !agentEnabled ? undefined : agentError ? 'danger' : 'success';

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      popperProps={{ position: 'end' }}
      toggle={(toggleRef: Ref<MenuToggleElement>) => (
        <MenuToggle
          status={status}
          ref={toggleRef}
          variant="plain"
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          aria-label={t('AI Agent settings')}
        >
          <Icon status={status} size={'xl'}>
            <AIExperienceIcon />
          </Icon>
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem key="header">
          <Switch
            id="agent-enabled"
            isChecked={agentEnabled}
            hasCheckIcon
            label={t('Agent Navigation')}
            onChange={(_event, checked: boolean) => {
              dispatch(setAgentEnabled(checked));
              setIsOpen(false);
            }}
          />
          <HelpPopover>
            {t(
              'Allow an AI agent with your user-id to connect with this console and use it to show you relevant views and correlation searches.',
            )}
          </HelpPopover>
        </DropdownItem>
        {!!agentError && (
          <DropdownItem>
            <Label status={status}>
              {t('Connection error')}: {String(agentError)}
            </Label>
          </DropdownItem>
        )}
      </DropdownList>
    </Dropdown>
  );
};

export default AgentMenu;
