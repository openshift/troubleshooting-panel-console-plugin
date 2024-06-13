import * as React from 'react';
import { useQueryParams } from './useQueryParams';
import { Korrel8rNodeFactory } from '../korrel8r/node-factory';
import { useLocation } from 'react-router';

export type QueryParams = [string, string][];

export const useURLState = () => {
  const queryParams = useQueryParams();
  const location = useLocation();

  const allQueryParameters = React.useMemo(() => getAllQueryParams(queryParams), [queryParams]);

  const korrel8rQueryFromURL = React.useMemo(() => {
    try {
      return Korrel8rNodeFactory.fromURL((location.pathname + location.search).slice(1)).toQuery();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return null;
    }
  }, [location.pathname, location.search]);

  return {
    allQueryParameters,
    korrel8rQueryFromURL,
  };
};

export function getAllQueryParams(urlParameters: URLSearchParams): QueryParams {
  const allQueryParams: QueryParams = [];
  urlParameters.forEach((value, key) => {
    allQueryParams.push([key, value]);
  });
  return allQueryParams;
}
