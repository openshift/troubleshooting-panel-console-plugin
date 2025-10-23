import { Button, Icon, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';

interface HelpPopoverProps {
  header?: string;
  children?: React.ReactNode;
}

export const HelpPopover: React.FC<HelpPopoverProps> = ({ header, children }) => {
  return (
    <Popover headerContent=<>{header}</> bodyContent={children}>
      <Button variant="plain" isInline>
        <Icon isInline size="sm">
          <OutlinedQuestionCircleIcon />
        </Icon>
      </Button>
    </Popover>
  );
};
