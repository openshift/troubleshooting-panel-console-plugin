import {
  Alert,
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalVariant,
  NumberInput,
} from '@patternfly/react-core';
import * as React from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import * as time from '../time';
import { DateTimePicker } from './DateTimePicker';
import { TimeUnitPicker } from './TimeUnitPicker';

const CUSTOM_RANGE_KEY = 'CUSTOM_RANGE';
const CUSTOM_DURATION_KEY = 'CUSTOM_DURATION';

const timeRangeOptions = [
  { key: '5m', period: new time.Duration(5, time.MINUTE) },
  { key: '30m', period: new time.Duration(30, time.MINUTE) },
  { key: '1h', period: new time.Duration(1, time.HOUR) },
  { key: '1d', period: new time.Duration(1, time.DAY) },
  { key: '1w', period: new time.Duration(1, time.WEEK) },
];

const keyFromPeriod = (period: time.Period): string => {
  if (period instanceof time.Duration) {
    const match = timeRangeOptions.find(
      (o) => o.period.count === period.count && o.period.unit === period.unit,
    );
    if (match) return match.key;
    return CUSTOM_DURATION_KEY;
  }
  return CUSTOM_RANGE_KEY;
};

const formatDate = (d: Date): string =>
  d
    .toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short', hour12: false })
    .replace(/,/g, '');

const labelFromPeriod = (period: time.Period, t: TFunction): string => {
  if (period instanceof time.Duration) {
    return `${t('Last')} ${period.count} ${t(period.unit.name)}`;
  }
  if (period instanceof time.Range) {
    return `${formatDate(period.start)}–${formatDate(period.end)}`;
  }
  return t('Custom');
};

interface TimeRangeModalProps {
  initialRange: time.Range;
  onSave: (range: time.Range) => void;
  onClose: () => void;
}

const TimeRangeModal: React.FC<TimeRangeModalProps> = ({ initialRange, onSave, onClose }) => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const [start, setStart] = React.useState(initialRange.start);
  const [end, setEnd] = React.useState(initialRange.end);

  const isValid = start < end;

  return (
    <Modal
      variant={ModalVariant.small}
      title={t('Custom time range')}
      isOpen
      onClose={onClose}
      actions={[
        <Button
          key="save"
          variant="primary"
          onClick={() => onSave(new time.Range(start, end))}
          isDisabled={!isValid}
        >
          {t('Save')}
        </Button>,
        <Button key="cancel" variant="link" onClick={onClose}>
          {t('Cancel')}
        </Button>,
      ]}
    >
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
        <FlexItem>
          <label>{t('From')}</label>
          <DateTimePicker date={start} onChange={setStart} />
        </FlexItem>
        <FlexItem>
          <label>{t('To')}</label>
          <DateTimePicker date={end} onChange={setEnd} />
        </FlexItem>
        {!isValid && (
          <Alert variant="danger" isInline isPlain title={t('End time must be after start time')} />
        )}
      </Flex>
    </Modal>
  );
};

interface DurationModalProps {
  initialDuration: time.Duration;
  onSave: (duration: time.Duration) => void;
  onClose: () => void;
}

const DurationModal: React.FC<DurationModalProps> = ({ initialDuration, onSave, onClose }) => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const [count, setCount] = React.useState(initialDuration.count);
  const [unit, setUnit] = React.useState(initialDuration.unit);

  const onChangeCount = (n: number) => setCount(Math.max(1, n || 1));

  return (
    <Modal
      variant={ModalVariant.small}
      title={t('Custom duration')}
      isOpen
      onClose={onClose}
      actions={[
        <Button
          key="save"
          variant="primary"
          onClick={() => onSave(new time.Duration(count, unit))}
          isDisabled={count < 1}
        >
          {t('Save')}
        </Button>,
        <Button key="cancel" variant="link" onClick={onClose}>
          {t('Cancel')}
        </Button>,
      ]}
    >
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>{t('Last')}</FlexItem>
        <FlexItem>
          <NumberInput
            value={count}
            min={1}
            onPlus={() => onChangeCount(count + 1)}
            onMinus={() => onChangeCount(count - 1)}
            onChange={(e) => onChangeCount(Number((e.target as HTMLInputElement).value))}
            widthChars={3}
          />
        </FlexItem>
        <FlexItem>
          <TimeUnitPicker unit={unit} onChange={setUnit} />
        </FlexItem>
      </Flex>
    </Modal>
  );
};

interface TimeRangeDropdownProps {
  period: time.Period;
  onChange: (period: time.Period) => void;
  className?: string;
}

export const TimeRangeDropdown: React.FC<TimeRangeDropdownProps> = ({
  period,
  onChange,
  className,
}) => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const [isOpen, setIsOpen] = React.useState(false);
  const [rangeModalOpen, setRangeModalOpen] = React.useState(false);
  const [durationModalOpen, setDurationModalOpen] = React.useState(false);

  const selectedKey = keyFromPeriod(period);

  const handleCustomRangeClick = () => {
    setIsOpen(false);
    setRangeModalOpen(true);
  };

  const handleCustomDurationClick = () => {
    setIsOpen(false);
    setDurationModalOpen(true);
  };

  const initialRange = React.useMemo(() => {
    const [start, end] = period.startEnd();
    return new time.Range(start, end);
  }, [period]);

  const initialDuration = React.useMemo(
    () => (period instanceof time.Duration ? period : new time.Duration(1, time.DAY)),
    [period],
  );

  return (
    <>
      <Dropdown
        isOpen={isOpen}
        onSelect={() => setIsOpen(false)}
        onOpenChange={setIsOpen}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsOpen(!isOpen)}
            isExpanded={isOpen}
            className={className}
          >
            {labelFromPeriod(period, t)}
          </MenuToggle>
        )}
      >
        <DropdownList>
          {timeRangeOptions.map(({ key, period: optPeriod }) => (
            <DropdownItem
              key={key}
              isSelected={key === selectedKey}
              onClick={() => onChange(optPeriod)}
            >
              {labelFromPeriod(optPeriod, t)}
            </DropdownItem>
          ))}
          <Divider />
          <DropdownItem
            key={CUSTOM_DURATION_KEY}
            isSelected={selectedKey === CUSTOM_DURATION_KEY}
            onClick={handleCustomDurationClick}
          >
            {t('Other duration')}
          </DropdownItem>
          <DropdownItem
            key={CUSTOM_RANGE_KEY}
            isSelected={selectedKey === CUSTOM_RANGE_KEY}
            onClick={handleCustomRangeClick}
          >
            {t('Start-end time range')}
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      {rangeModalOpen && (
        <TimeRangeModal
          initialRange={initialRange}
          onSave={(range) => {
            setRangeModalOpen(false);
            onChange(range);
          }}
          onClose={() => setRangeModalOpen(false)}
        />
      )}
      {durationModalOpen && (
        <DurationModal
          initialDuration={initialDuration}
          onSave={(duration) => {
            setDurationModalOpen(false);
            onChange(duration);
          }}
          onClose={() => setDurationModalOpen(false)}
        />
      )}
    </>
  );
};
