import { action, ActionType as Action } from 'typesafe-actions';
import { Constraint, Graph } from './korrel8r/types';
import { DAY, Duration, Period } from './time';

export enum ActionType {
  CloseTroubleshootingPanel = 'closeTroubleshootingPanel',
  OpenTroubleshootingPanel = 'openTroubleshootingPanel',
  SetPersistedSearch = 'setPersistedSearch',
}

export enum SearchType {
  Distance = 'distance',
  Goal = 'goal',
}

// Search parameters from panel widgets for korrel8r request.
export type Search = {
  queryStr?: string;
  type?: SearchType;
  depth?: number;
  goal?: string;
  constraint?: Constraint;
  period?: Period; // Constraint is updated from period on each call.
};

// Result displayed in troubleshooting panel, graph or error.
export type Result = {
  graph?: Graph;
  message?: string;
  title?: string;
  isError?: boolean;
};

// Search parameters and result of the last search.
export type SearchResult = {
  search: Search;
  result?: Result;
};

// Default search parameters do a neighbourhood search of depth 3.
export const defaultSearch = {
  type: SearchType.Distance,
  depth: 3,
  period: new Duration(1, DAY),
};

export const closeTP = () => action(ActionType.CloseTroubleshootingPanel);
export const openTP = () => action(ActionType.OpenTroubleshootingPanel);
export const setPersistedSearch = (searchResult: SearchResult) =>
  action(ActionType.SetPersistedSearch, searchResult);

export const actions = {
  closeTP,
  openTP,
  setPersistedSearch,
};

export type TPAction = Action<typeof actions>;
