import { getCSRFToken } from '@openshift-console/dynamic-plugin-sdk/lib/utils/fetch/console-fetch-utils';
import { Goals, Korrel8rClient, Neighbours } from './korrel8r/client';

const KORREL8R_ENDPOINT =
  '/api/proxy/plugin/troubleshooting-panel-console-plugin/korrel8r/api/v1alpha1';

export const listDomains = () => {
  const korrel8rClient = new Korrel8rClient({
    BASE: KORREL8R_ENDPOINT,
  });

  return korrel8rClient.default.getDomains();
};

export const getNeighborsGraph = (neighbours: Neighbours) => {
  const korrel8rClient = new Korrel8rClient({
    HEADERS: {
      Accept: 'application/json',
      'X-CSRFToken': getCSRFToken(),
    },
    BASE: KORREL8R_ENDPOINT,
  });

  return korrel8rClient.default.postGraphsNeighbours(neighbours);
};

export const getGoalsGraph = (goals: Goals) => {
  const korrel8rClient = new Korrel8rClient({
    HEADERS: {
      Accept: 'application/json',
      'X-CSRFToken': getCSRFToken(),
    },
    BASE: KORREL8R_ENDPOINT,
  });

  return korrel8rClient.default.postGraphsGoals(goals);
};
