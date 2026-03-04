import {
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';

import * as React from 'react';
import { useTimeUnits } from '../hooks/useTimeUnits';
import * as time from '../time';

interface TimeUnitPickerProps {
  unit: time.Unit;
  onChange: (unit: time.Unit) => void;
}

/** Pick a time unit (hours, days etc) */
export const TimeUnitPicker: React.FC<TimeUnitPickerProps> = ({ unit, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const unitToLabel = useTimeUnits();

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle ref={toggleRef} onClick={() => setIsOpen(!isOpen)} isExpanded={isOpen}>
      {unitToLabel(unit)}
    </MenuToggle>
  );

  return (
    <Select
      id={'unit-select'}
      selected={unit}
      isOpen={isOpen}
      onSelect={(_: React.MouseEvent, value: string | number) => {
        onChange(value as time.Unit);
        setIsOpen(false);
      }}
      onOpenChange={setIsOpen}
      toggle={toggle}
    >
      <SelectList>
        {time.units.map((u) => (
          <SelectOption key={u} value={u}>
            {unitToLabel(u)}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
