import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  FormGroup,
  InputGroup,
  InputGroupItem,
  NumberInput,
  TextInput,
  Title,
} from '@patternfly/react-core';
import * as React from 'react';
import { TFunction } from 'react-i18next';
import { Search, SearchType } from '../redux-actions';
import { Chooser } from './Chooser';
import { HelpPopover } from './HelpPopover';

export interface SearchFormGroupProps {
  search: Search;
  label: string;
  onChange: (newSearch: Search) => void;
  minDepth: number;
  maxDepth: number;
  t: TFunction;
}

export const SearchFormGroup: React.FC<SearchFormGroupProps> = ({
  search,
  label,
  onChange,
  minDepth,
  maxDepth,
  t,
}) => {
  const chooser = (
    <Chooser
      selectedID={search.type}
      onChange={(id: string) => onChange({ ...search, type: id as SearchType })}
      items={[
        {
          id: SearchType.Distance,
          label: t('Distance'),
        },
        {
          id: SearchType.Goal,
          label: t('Goal Class'),
        },
      ]}
    />
  );

  const onChangeDepth = (n: number) => {
    if (n) onChange({ ...search, depth: Math.min(maxDepth, Math.max(minDepth, n)) });
  };

  const distanceInput = (
    <InputGroup>
      <InputGroupItem>
        <NumberInput
          value={search.depth}
          min={minDepth}
          max={maxDepth}
          onPlus={() => onChangeDepth(search.depth + 1)}
          onMinus={() => onChangeDepth(search.depth + -1)}
          onChange={(e) => onChangeDepth(Number((e.target as HTMLInputElement).value))}
        />
      </InputGroupItem>
    </InputGroup>
  );

  const goalInput = (
    <InputGroup>
      <InputGroupItem>
        <TextInput
          value={search.goal}
          placeholder="domain:classname"
          onChange={(e) => onChange({ ...search, goal: (e.target as HTMLInputElement).value })}
        />
      </InputGroupItem>
    </InputGroup>
  );

  const help = (
    <HelpPopover header={label}>
      <DescriptionList>
        <DescriptionListGroup>
          <DescriptionListTerm>Distance</DescriptionListTerm>
          <DescriptionListDescription>
            {t(
              'Follows correlation rules from the starting point to find related data, then continues the search from that data, up to the number of steps you specify.',
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Goal Class</DescriptionListTerm>
          <DescriptionListDescription>
            {t('Find all paths to items of the specified goal class.')}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </HelpPopover>
  );

  return (
    <FormGroup
      label={
        <Title headingLevel="h4">
          {label}
          {help}
        </Title>
      }
    >
      <Flex direction={{ default: 'column' }}>
        <FlexItem>{chooser}</FlexItem>
        {search.type == SearchType.Distance ? distanceInput : goalInput}
      </Flex>
    </FormGroup>
  );
};
