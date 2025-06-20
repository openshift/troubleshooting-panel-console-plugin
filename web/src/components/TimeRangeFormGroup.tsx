import {
  Flex,
  FlexItem,
  FormGroup,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  NumberInput,
} from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import * as time from '../time';
import { Chooser } from './Chooser';
import { DateTimePicker } from './DateTimePicker';
import { TimeUnitPicker } from './TimeUnitPicker';

interface TimeRangeFormGroupProps {
  label: string;
  period: time.Period;
  title?: React.ReactElement; // <Title> element
  onChange: (newValue: time.Period) => void;
  defaultDuration?: time.Duration;
  defaultRange?: time.Range;
}

// FIXME put back Validator;;;

const DURATION = 'duration';
const RANGE = 'range';

const TimeRangeFormGroup: React.FC<TimeRangeFormGroupProps> = ({
  label,
  period,
  onChange,
  defaultDuration = new time.Duration(1, time.DAY),
  defaultRange = new time.Range(...new time.Duration(1, time.DAY).startEnd()),
}) => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const type = period instanceof time.Duration ? DURATION : RANGE;
  const duration = type === DURATION ? (period as time.Duration) : defaultDuration;
  const range = type === RANGE ? (period as time.Range) : defaultRange;

  const onChangeDuration = (d: number) =>
    onChange(new time.Duration(Math.max(1, d), duration.unit));
  const durationPicker = (
    <InputGroup>
      <InputGroupText isPlain>{t('Last')}</InputGroupText>
      <InputGroupItem>
        <NumberInput
          value={duration.count}
          min={0}
          onPlus={() => onChangeDuration(duration.count + 1)}
          onMinus={() => onChangeDuration(duration.count - 1)}
          onChange={(e) => onChangeDuration(Number((e.target as HTMLInputElement).value))}
          widthChars={3}
        />
      </InputGroupItem>
      <InputGroupItem>
        <TimeUnitPicker
          unit={duration.unit}
          onChange={(unit: time.Unit) => onChange(new time.Duration(duration.count, unit))}
        />
      </InputGroupItem>
    </InputGroup>
  );

  const rangePicker = (
    <InputGroup>
      <DateTimePicker
        date={range.start}
        label={t('Start')}
        onChange={(newStart: Date) => {
          onChange(new time.Range(newStart, range.end));
        }}
      />
      <DateTimePicker
        date={range.end}
        label={t('End')}
        onChange={(newEnd: Date) => {
          onChange(new time.Range(range.start, newEnd));
        }}
      />
    </InputGroup>
  );

  return (
    <FormGroup
      label={
        <Flex direction={{ default: 'row' }}>
          <FlexItem>{label}</FlexItem>
          <Chooser
            selectedID={type}
            onChange={(id: string) => onChange(id === DURATION ? duration : range)}
            items={[
              { id: DURATION, label: t('Duration'), tooltip: t('Duration up to the present.') },
              { id: RANGE, label: t('Range'), tooltip: t('Explicit start-end times.') },
            ]}
          />
          {type === DURATION ? durationPicker : rangePicker}
        </Flex>
      }
    ></FormGroup>
  );
};

export default TimeRangeFormGroup;
