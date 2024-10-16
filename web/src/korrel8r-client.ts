import { cancellableFetch } from './cancellable-fetch';
import { Korrel8rGraphResponse, Korrel8rResponse } from './korrel8r/query.types';
import { Query } from './redux-actions';

const KORREL8R_ENDPOINT = '/api/proxy/plugin/troubleshooting-panel-console-plugin/korrel8r';

export const listDomains = () => {
  const requestData = { method: 'GET' };

  return cancellableFetch<Korrel8rResponse>(
    `${KORREL8R_ENDPOINT}/api/v1alpha1/domains`,
    requestData,
  );
};

export const getNeighborsGraph = (query: Query) => {
  const requestData = {
    method: 'POST',
    body: JSON.stringify({
      start: {
        queries: query.query ? [query.query.trim()] : [],
      },
      depth: query.depth,
    }),
  };

  return cancellableFetch<Korrel8rGraphResponse>(
    `${KORREL8R_ENDPOINT}/api/v1alpha1/graphs/neighbours`,
    requestData,
  );
};

export const getGoalsGraph = (query: Query) => {
  const requestData = {
    method: 'POST',
    body: JSON.stringify({
      start: {
        queries: query.query ? [query.query.trim()] : [],
      },
      goals: [query.goal],
    }),
  };

  return cancellableFetch<Korrel8rGraphResponse>(
    `${KORREL8R_ENDPOINT}/api/v1alpha1/graphs/goals`,
    requestData,
  );
};
