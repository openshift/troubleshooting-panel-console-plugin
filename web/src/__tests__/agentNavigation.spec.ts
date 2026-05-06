jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({}), { virtual: true });

import { toAPISearch, fromAPISearch } from '../hooks/useAgentNavigation';
import { Search, SearchType } from '../redux-actions';
import * as api from '../korrel8r/client';

describe('toAPISearch', () => {
  it('converts a goal search', () => {
    const search: Search = {
      queryStr: 'k8s:Pod:{}',
      searchType: SearchType.Goal,
      goal: 'log:application',
    };
    expect(toAPISearch(search)).toEqual({
      goals: { start: { queries: ['k8s:Pod:{}'] }, goals: ['log:application'] },
    });
  });

  it('converts a depth search', () => {
    const search: Search = {
      queryStr: 'k8s:Pod:{}',
      searchType: SearchType.Depth,
      depth: 3,
    };
    expect(toAPISearch(search)).toEqual({
      neighbors: { start: { queries: ['k8s:Pod:{}'] }, depth: 3 },
    });
  });
});

describe('fromAPISearch', () => {
  it('converts a goals search', () => {
    const apiSearch: api.Search = {
      goals: { start: { queries: ['k8s:Pod:{}'] }, goals: ['log:application'] },
    };
    expect(fromAPISearch(apiSearch)).toEqual({
      queryStr: 'k8s:Pod:{}',
      searchType: SearchType.Goal,
      goal: 'log:application',
    });
  });

  it('converts a neighbors search', () => {
    const apiSearch: api.Search = {
      neighbors: { start: { queries: ['k8s:Pod:{}'] }, depth: 5 },
    };
    expect(fromAPISearch(apiSearch)).toEqual({
      queryStr: 'k8s:Pod:{}',
      searchType: SearchType.Depth,
      depth: 5,
    });
  });

  it('returns undefined when both goals and neighbors are set', () => {
    const apiSearch: api.Search = {
      goals: { start: { queries: ['k8s:Pod:{}'] }, goals: ['log:application'] },
      neighbors: { start: { queries: ['k8s:Pod:{}'] }, depth: 3 },
    };
    expect(fromAPISearch(apiSearch)).toBeUndefined();
  });

  it('returns undefined when neither goals nor neighbors are set', () => {
    expect(fromAPISearch({})).toBeUndefined();
  });

  it('returns undefined when queryStr is missing', () => {
    const apiSearch: api.Search = {
      goals: { start: { queries: [] }, goals: ['log:application'] },
    };
    expect(fromAPISearch(apiSearch)).toBeUndefined();
  });

  it('defaults depth to 3 when not provided', () => {
    const apiSearch: api.Search = {
      neighbors: { start: { queries: ['k8s:Pod:{}'] }, depth: 0 },
    };
    expect(fromAPISearch(apiSearch)).toEqual({
      queryStr: 'k8s:Pod:{}',
      searchType: SearchType.Depth,
      depth: 3,
    });
  });
});
