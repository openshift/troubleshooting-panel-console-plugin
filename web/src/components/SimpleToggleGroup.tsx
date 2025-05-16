import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import * as React from 'react';

interface SimpleToggleGroupProps {
  items: { text: string; value: string }[];
  initValue: string;
  onChange: (value: string) => void;
}

export const SimpleToggleGroup: React.FC<SimpleToggleGroupProps> = ({
  items,
  initValue,
  onChange,
}) => {
  const [selected, setSelected] = React.useState(initValue);
  const toggle = (text: string, value: string) => (
    <ToggleGroupItem
      text={text}
      buttonId={value}
      isSelected={selected === value}
      onChange={() => {
        setSelected(value);
        onChange(value);
      }}
    />
  );
  return <ToggleGroup>{items.map(({ text, value }) => toggle(text, value))}</ToggleGroup>;
};
