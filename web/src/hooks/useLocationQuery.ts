import { useLocation } from 'react-router-dom-v5-compat';
import { allDomains } from '../korrel8r/all-domains';
import { Query, URIRef } from '../korrel8r/types';

/** Returns the Korrel8r query for the current browser location or undefined */
export const useLocationQuery = (): Query | undefined => {
  const location = useLocation();
  try {
    const link = new URIRef(location.pathname + location.search);
    const q = allDomains.linkToQuery(link);
    // eslint-disable-next-line no-console
    console.log('korrel8r linkToQuery', "\nlink", link, "\nquery", q);
    return q;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`useLocation error ${location.toString()} => ${e}`);
  }
};
