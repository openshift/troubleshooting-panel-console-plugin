import {
  DatePicker,
  InputGroup,
  InputGroupItem,
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
}> = ({ date, onChange }) => {
  if (!isValidDate(date)) date = new Date();
  return (
    <InputGroup>
      <InputGroupItem>
        <DatePicker
          value={isValidDate(date) ? yyyyMMddFormat(date) : ''}
          onChange={(_event, _inputDate, newDate) => onChange(copyTime(newDate, date))}
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
