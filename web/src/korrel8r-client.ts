import { getCSRFToken } from '@openshift-console/dynamic-plugin-sdk/lib/utils/fetch/console-fetch-utils';
import { Korrel8rClient } from './korrel8r/client';
import { Query } from './redux-actions';

const KORREL8R_ENDPOINT = '/api/proxy/plugin/troubleshooting-panel-console-plugin/korrel8r';

export const listDomains = () => {
  const korrel8rClient = new Korrel8rClient({
    BASE: KORREL8R_ENDPOINT,
  });

  return korrel8rClient.default.getDomains();
};

export const getNeighborsGraph = (query: Query) => {
  const korrel8rClient = new Korrel8rClient({
    HEADERS: {
      Accept: 'application/json',
      'X-CSRFToken': getCSRFToken(),
    },
    BASE: KORREL8R_ENDPOINT,
  });

  return korrel8rClient.default.postGraphsNeighbours({
    start: {
      queries: query.query ? [query.query.trim()] : [],
    },
    depth: query.depth,
  });
};

export const getGoalsGraph = (query: Query) => {
  const korrel8rClient = new Korrel8rClient({
    HEADERS: {
      Accept: 'application/json',
      'X-CSRFToken': getCSRFToken(),
    },
    BASE: KORREL8R_ENDPOINT,
  });

  return korrel8rClient.default.postGraphsGoals({
    start: {
      queries: query.query ? [query.query.trim()] : [],
    },
    goals: [query.goal],
  });
};
