import {
  DatePicker,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  isValidDate,
  TimePicker,
  yyyyMMddFormat,
} from '@patternfly/react-core';
import * as React from 'react';
import { copyTime, setTime } from '../time';

/** Combine date and time pickers, return the result as a Date */
export const DateTimePicker: React.FC<{
  date: Date;
  onChange: (date: Date) => void;
  label: string;
}> = ({ date, onChange, label }) => {
  if (!isValidDate(date)) date = new Date();
  return (
    <InputGroup>
      <InputGroupText isPlain>{label}</InputGroupText>
      <InputGroupItem>
        <DatePicker
          value={isValidDate(date) ? yyyyMMddFormat(date) : ''}
          onChange={(_event, _inputDate, newDate) => onChange(copyTime(newDate, date))}
          aria-label={label}
        />
      </InputGroupItem>
      <InputGroupItem>
        <TimePicker
          time={date}
          onChange={(_event, _time, hour, minute, second, isValid) => {
            if (isValid) onChange(setTime(date, hour, minute, second));
          }}
          is24Hour={true}
          width="80px"
        />
      </InputGroupItem>
    </InputGroup>
  );
};
