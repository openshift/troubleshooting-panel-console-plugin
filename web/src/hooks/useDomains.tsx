import * as React from 'react';
import { useSelector } from 'react-redux';
import { AlertDomain } from '../korrel8r/alert';
import { allDomains } from '../korrel8r/all-domains';
import { Domains } from '../korrel8r/types';
import { State } from '../redux-reducers';

// The alert domain is dependent on alert Rules state , so we need a hook for domains
export const useDomains = () => {
  const alertRules = useSelector((state: State) => state.observe?.get('rules'));

  const alertIDs = React.useMemo(() => {
    if (!alertRules) return new Map<string, string>();
    return new Map<string, string>(alertRules.map(({ id, name }) => [id, name]));
  }, [alertRules]);

  const domains = React.useMemo(() => {
    // Alert domain with IDs loaded from state.
    const alert = new AlertDomain(alertIDs);
    // Replace the default alert domain.
    return new Domains(...allDomains.filter((d) => d.name !== alert.name), alert);
  }, [alertIDs]);
  return domains;
};
