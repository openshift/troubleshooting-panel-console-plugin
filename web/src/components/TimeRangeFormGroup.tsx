import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  FormGroup,
  NumberInput,
  Text,
  TextVariants,
  Title,
} from '@patternfly/react-core';
import * as React from 'react';
import { TFunction } from 'react-i18next';
import * as time from '../time';
import { Chooser } from './Chooser';
import { DateTimePicker } from './DateTimePicker';
import { HelpPopover } from './HelpPopover';
import { TimeUnitPicker } from './TimeUnitPicker';

interface TimeRangeFormGroupProps {
  label: string;
  period: time.Period;
  title?: React.ReactElement; // <Title> element
  onChange: (newValue: time.Period) => void;
  t: TFunction;
  defaultDuration?: time.Duration;
  defaultRange?: time.Range;
}

// FIXME put back Validator;;;

const RECENT = 'duration';
const RANGE = 'range';

const TimeRangeFormGroup: React.FC<TimeRangeFormGroupProps> = ({
  label,
  period,
  onChange,
  t,
  defaultDuration = new time.Duration(1, time.DAY),
  defaultRange = new time.Range(...new time.Duration(1, time.DAY).startEnd()),
}) => {
  const type = period instanceof time.Duration ? RECENT : RANGE;
  const duration = type === RECENT ? (period as time.Duration) : defaultDuration;
  const range = type === RANGE ? (period as time.Range) : defaultRange;

  const onChangeDuration = (d: number) =>
    onChange(new time.Duration(Math.max(1, d), duration.unit));

  const recentPicker = (
    <Flex>
      <FlexItem>
        <Text component={TextVariants.h6}> {t('Since')}</Text>
        <NumberInput
          value={duration.count}
          min={0}
          onPlus={() => onChangeDuration(duration.count + 1)}
          onMinus={() => onChangeDuration(duration.count - 1)}
          onChange={(e) => onChangeDuration(Number((e.target as HTMLInputElement).value))}
          widthChars={3}
        />
      </FlexItem>
      <FlexItem>
        <Text component={TextVariants.h6}> {t('Ago')}</Text>
        <TimeUnitPicker
          unit={duration.unit}
          onChange={(unit: time.Unit) => onChange(new time.Duration(duration.count, unit))}
        />
      </FlexItem>
    </Flex>
  );

  // FXIME allow blank, -toggle.
  const rangePicker = (
    <>
      <DateTimePicker
        date={range.start}
        onChange={(newStart: Date) => {
          onChange(new time.Range(newStart, range.end));
        }}
      />
      <p>{t('to')}</p>
      <DateTimePicker
        date={range.end}
        onChange={(newEnd: Date) => {
          onChange(new time.Range(range.start, newEnd));
        }}
      />
    </>
  );

  const help = (
    <HelpPopover header={label}>
      <DescriptionList>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Recent')}</DescriptionListTerm>
          <DescriptionListDescription>
            {t('Return only results more recent than the specified duration.')}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Range')}</DescriptionListTerm>
          <DescriptionListDescription>
            {t('Return only results in the specified time range.')}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </HelpPopover>
  );

  return (
    <FormGroup
      label={
        <Title headingLevel="h4">
          {label} {help}
        </Title>
      }
    >
      <Flex direction={{ default: 'column' }}>
        <FlexItem>
          <Chooser
            selectedID={type}
            onChange={(id: string) => onChange(id === RECENT ? duration : range)}
            items={[
              { id: RECENT, label: t('Recent') },
              { id: RANGE, label: t('Range') },
            ]}
          />
        </FlexItem>
        <FlexItem>{type === RECENT ? recentPicker : rangePicker}</FlexItem>
      </Flex>
    </FormGroup>
  );
};

export default TimeRangeFormGroup;
