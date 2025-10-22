import {
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import * as React from 'react';
import * as time from '../time';

interface TimeUnitPickerProps {
  unit: time.Unit;
  onChange: (unit: time.Unit) => void;
}

/** Pick a time unit (hours, days etc) */
export const TimeUnitPicker: React.FC<TimeUnitPickerProps> = ({ unit, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle ref={toggleRef} onClick={() => setIsOpen(!isOpen)} isExpanded={isOpen}>
      {unit.name}
    </MenuToggle>
  );

  return (
    <Select
      id={'unit-select'}
      selected={unit.name}
      isOpen={isOpen}
      onSelect={(_: React.MouseEvent, value: string) => {
        const newUnit = time.Unit.get(value);
        if (newUnit) onChange(newUnit);
        setIsOpen(false);
      }}
      onOpenChange={(isOpen: boolean) => setIsOpen(!isOpen)}
      toggle={toggle}
    >
      <SelectList>
        {time.Unit.all().map((u) => (
          <SelectOption key={u.name} value={u.name}>
            {' '}
            {u.name}{' '}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
