import { cancellableFetch } from './cancellable-fetch';
import { Korrel8rResponse, Korrel8rGraphNeighboursResponse } from './korrel8r/query.types';

const KORREL8R_ENDPOINT = '/api/proxy/plugin/troubleshooting-panel-console-plugin/korrel8r';

export const listDomains = () => {
  const requestData = { method: 'GET' };

  return cancellableFetch<Korrel8rResponse>(
    `${KORREL8R_ENDPOINT}/api/v1alpha1/domains`,
    requestData,
  );
};

export const getNeighborsGraph = ({ query }: { query?: string } = {}) => {
  const requestData = {
    method: 'POST',
    body: JSON.stringify({
      start: {
        queries: query ? [query] : [],
      },
      depth: 5,
    }),
  };

  return cancellableFetch<Korrel8rGraphNeighboursResponse>(
    `${KORREL8R_ENDPOINT}/api/v1alpha1/graphs/neighbours`,
    requestData,
  );
};
