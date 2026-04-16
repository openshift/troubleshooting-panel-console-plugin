import { action, ActionType as Action } from 'typesafe-actions';
import { Duration, HOUR, Period } from './time';

export enum ActionType {
  CloseTroubleshootingPanel = 'closeTroubleshootingPanel',
  OpenTroubleshootingPanel = 'openTroubleshootingPanel',
  SetSearch = 'setSearch',
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

export const actions = {
  closeTP,
  openTP,
  setSearch,
};

export type TPAction = Action<typeof actions>;
