import {
  FormGroup,
  InputGroup,
  InputGroupItem,
  NumberInput,
  TextInput,
} from '@patternfly/react-core';
import * as React from 'react';
import { TFunction, Trans } from 'react-i18next';
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
      <Trans t={t}>
        <p>
          <b>Distance</b>: Find all related items up to the specified distance.
        </p>
        <p>
          <b>Goal Class</b>: Find all paths to items of the specified goal class.
        </p>
      </Trans>
    </HelpPopover>
  );

  return (
    <FormGroup
      label=<>
        {label}
        {help}
      </>
    >
      {chooser}
      {search.type == SearchType.Distance ? distanceInput : goalInput}
    </FormGroup>
  );
};
