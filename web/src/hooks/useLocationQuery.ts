import { useLocation } from 'react-router-dom-v5-compat';
import { Domains, Query, URIRef } from '../korrel8r/types';

/** Returns the Korrel8r query for the current browser location or undefined */
export const useLocationQuery = (domains: Domains): Query | undefined => {
  const location = useLocation();
  try {
    const link = new URIRef(location.pathname + location.search);
    const q = domains.linkToQuery(link);
    return q;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('useLocation', e);
  }
};
