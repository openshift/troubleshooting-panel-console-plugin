import {
  Flex,
  FlexItem,
  FormGroup,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  NumberInput,
  TextInput,
} from '@patternfly/react-core';
import * as React from 'react';
import { TFunction } from 'react-i18next';
import { Search, SearchType } from '../redux-actions';
import { Chooser } from './Chooser';

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
          id: SearchType.Neighbour,
          label: t('Neighbourhood'),
          tooltip: t('Find neighbours by traversing up to the specified depth.'),
        },
        {
          id: SearchType.Goal,
          label: t('Goal Search'),
          tooltip: t('Find all paths to the goal class.'),
        },
      ]}
    />
  );

  const onChangeDepth = (n: number) => {
    if (n) onChange({ ...search, depth: Math.min(maxDepth, Math.max(minDepth, n)) });
  };

  const neighbourInput = (
    <InputGroup>
      <InputGroupText isPlain>{t('Depth')}</InputGroupText>
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
      <InputGroupText isPlain>{t('Goal class for search:')}</InputGroupText>
      <InputGroupItem>
        <TextInput
          value={search.goal}
          placeholder="domain:class"
          onChange={(e) => onChange({ ...search, goal: (e.target as HTMLInputElement).value })}
        />
      </InputGroupItem>
    </InputGroup>
  );

  return (
    <FormGroup
      label={
        <Flex direction={{ default: 'row' }}>
          <FlexItem>{label}</FlexItem>
          {chooser}
        </Flex>
      }
    >
      {search.type == SearchType.Neighbour ? neighbourInput : goalInput}
    </FormGroup>
  );
};
