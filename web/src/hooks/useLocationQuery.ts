import { useLocation } from 'react-router-dom-v5-compat';
import { Query, URIRef } from '../korrel8r/types';
import { useDomains } from './useDomains';

/** Returns the Korrel8r query for the current browser location or undefined */
export const useLocationQuery = (): Query | undefined => {
  const domains = useDomains();
  const location = useLocation();
  try {
    const link = new URIRef(location.pathname + location.search);
    const q = domains.linkToQuery(link);
    return q;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`korrel8r useLocationQuery: ${e}`);
  }
};
