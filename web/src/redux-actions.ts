import { action, ActionType as Action } from 'typesafe-actions';
import * as api from './korrel8r/client';
import { Duration, HOUR, Period } from './time';

export enum ActionType {
  CloseTroubleshootingPanel = 'closeTroubleshootingPanel',
  OpenTroubleshootingPanel = 'openTroubleshootingPanel',
  SetSearch = 'setSearch',
  SetAgentError = 'setAgentError',
}

export enum SearchType {
  Depth = 'depth',
  Goal = 'goal',
}

// Search parameters from panel widgets for korrel8r request.
export type Search = {
  queryStr: string;
  searchType: SearchType;
  depth?: number;
  goal?: string;
  period?: Period;
};

// Default search parameters do a neighbourhood search of depth 3.
export const defaultSearch: Search = {
  queryStr: '',
  searchType: SearchType.Depth,
  depth: 3,
  period: new Duration(1, HOUR),
};

export const closeTP = () => action(ActionType.CloseTroubleshootingPanel);
export const openTP = () => action(ActionType.OpenTroubleshootingPanel);
export const setSearch = (search: Search) => action(ActionType.SetSearch, search);
export const setAgentError = (error: string) => action(ActionType.SetAgentError, error);

export const actions = {
  closeTP,
  openTP,
  setSearch,
  setAgentError,
};

export type TPAction = Action<typeof actions>;

export const apiSearch = (search: Search): api.Search => {
  const start: api.Start = { queries: [search.queryStr] };
  if (search.searchType === SearchType.Goal) {
    return { goals: { start, goals: [search.goal] } };
  }
  return { neighbors: { start, depth: search.depth } };
};

export const reduxSearch = (search: api.Search): Partial<Search> => {
  if (search.goals) {
    return {
      queryStr: search.goals.start?.queries?.[0],
      searchType: SearchType.Goal,
      goal: search.goals.goals?.[0],
    };
  }
  if (search.neighbors) {
    return {
      queryStr: search.neighbors.start?.queries?.[0],
      searchType: SearchType.Depth,
      depth: search.neighbors.depth,
    };
  }
  return {};
};
