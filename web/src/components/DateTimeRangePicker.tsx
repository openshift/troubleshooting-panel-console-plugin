import {
  DatePicker,
  Flex,
  FlexItem,
  InputGroup,
  InputGroupItem,
  isValidDate,
  MenuToggle,
  MenuToggleElement,
  NumberInput,
  Select,
  SelectList,
  SelectOption,
  TimePicker,
  yyyyMMddFormat,
} from '@patternfly/react-core';
import * as React from 'react';
import { SimpleToggleGroup } from './SimpleToggleGroup';

interface DateTimeRangePickerProps {
  from: Date | null;
  to: Date | null;
  onDateChange: (type: 'start' | 'end', newDate: Date, hour?: number, minute?: number) => void;
}

const DateTimeRangePicker: React.FC<DateTimeRangePickerProps> = ({ from, to, onDateChange }) => {
  enum RangeType { // Use can choose duration up till now, or a specific range.
    duration = 'duration',
    range = 'range',
  }
  const [rangeType, setRangeType] = React.useState(RangeType.duration);

  const units = ['minutes', 'hours', 'days', 'weeks'];
  const defaultUnit = 'days';
  const defaultDuration = 1;

  const [duration, setDuration] = React.useState(defaultDuration);
  const [unit, setUnit] = React.useState(defaultUnit);
  const [unitIsOpen, setUnitIsOpen] = React.useState(false);

  const toValidator = (date: Date): string => {
    // Date comparison validation
    return isValidDate(from) && yyyyMMddFormat(date) >= yyyyMMddFormat(from)
      ? ''
      : 'The "to" date must be after the "from" date';
  };

  const unitToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle ref={toggleRef} onClick={() => setUnitIsOpen(!unitIsOpen)} isExpanded={unitIsOpen}>
      {unit}
    </MenuToggle>
  );

  return (
    // FIXME update from/to date range from duration
    // Clean up date calculations.
    <Flex direction={{ default: 'column' }}>
      <Flex>
        <h3>Time range</h3>
        <SimpleToggleGroup
          items={[
            { text: 'Duration until now', value: RangeType.duration },
            { text: 'Any time range', value: RangeType.range },
          ]}
          initValue={RangeType.duration}
          onChange={(value: string) => {
            setRangeType(value as RangeType);
          }}
        />
      </Flex>

      <FlexItem hidden={rangeType !== RangeType.duration}>
        <Flex>
          <p>Last</p>
          <NumberInput
            value={duration}
            min={0}
            onPlus={() => setDuration(duration + 1)}
            onMinus={() => setDuration(duration > 0 ? duration - 1 : duration)}
            onChange={(e: React.FormEvent<HTMLInputElement>) => {
              setDuration(Number((e.target as HTMLInputElement).value));
            }}
          />
          <Select
            id={'unit-select'}
            isOpen={unitIsOpen}
            toggle={unitToggle}
            onSelect={(_: React.MouseEvent, value: string) => {
              setUnit(value);
              setUnitIsOpen(false);
            }}
            onOpenChange={(isOpen: boolean) => setUnitIsOpen(!isOpen)}
            selected={unit}
          >
            <SelectList>
              {units.map((v) => (
                <SelectOption key={v} value={v}>
                  {v}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </Flex>
      </FlexItem>

      <FlexItem hidden={rangeType !== RangeType.range}>
        <InputGroup>
          <InputGroupItem>
            <DatePicker
              value={isValidDate(from) ? yyyyMMddFormat(from) : ''}
              onChange={(_event, _inputDate, newFromDate) => {
                if (isValidDate(newFromDate)) {
                  onDateChange('start', newFromDate); // Pass 'start' type to handler
                }
              }}
              aria-label="Start date"
              placeholder="YYYY-MM-DD"
            />
          </InputGroupItem>
          <InputGroupItem>
            <TimePicker
              aria-label="Start time"
              style={{ width: '150px' }}
              onChange={(_event, _time, hour, minute) => {
                if (isValidDate(from)) {
                  onDateChange('start', from as Date, hour, minute); // Update start time
                }
              }}
            />
          </InputGroupItem>
          <div>to</div>
          <InputGroupItem>
            <DatePicker
              value={isValidDate(to) ? yyyyMMddFormat(to as Date) : ''}
              onChange={(_event, _inputDate, newToDate) => {
                if (isValidDate(newToDate)) {
                  onDateChange('end', newToDate); // Pass 'end' type to handler
                }
              }}
              isDisabled={!isValidDate(from)}
              rangeStart={from}
              validators={[toValidator]}
              aria-label="End date"
              placeholder="YYYY-MM-DD"
            />
          </InputGroupItem>
          <InputGroupItem>
            <TimePicker
              style={{ width: '150px' }}
              onChange={(_event, _time, hour, minute) => {
                if (isValidDate(to)) {
                  onDateChange('end', to as Date, hour, minute); // Update end time
                }
              }}
              isDisabled={!isValidDate(from)}
            />
          </InputGroupItem>
        </InputGroup>
      </FlexItem>
    </Flex>
  );
};

export default DateTimeRangePicker;
