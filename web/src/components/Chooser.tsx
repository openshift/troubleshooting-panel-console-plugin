import { ToggleGroup, ToggleGroupItem, Tooltip } from '@patternfly/react-core';
import * as React from 'react';
import './korrel8rpanel.css';

export interface ChooserProps {
  selectedID: string;
  items: { label: string; id: string; tooltip?: string }[];
  onChange: (id: string) => void;
}

export const Chooser: React.FC<ChooserProps> = ({ selectedID, items, onChange }) => (
  <ToggleGroup>
    {items.map(({ label, id, tooltip }) => {
      let item = (
        <ToggleGroupItem
          text={label}
          isSelected={selectedID === id}
          onChange={(_, on) => on && onChange && onChange(id)}
        />
      );
      if (tooltip) item = <Tooltip content={tooltip}>{item}</Tooltip>;
      return item;
    })}
  </ToggleGroup>
);
