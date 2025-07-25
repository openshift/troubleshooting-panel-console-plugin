import { Class, Domain, Query, URIRef, keyValueList, parseKeyValueList } from './types';

export class AlertDomain extends Domain {
  // Constructor takes an optional map of alert rule ID to name mappings.
  // Numeric IDs are used to refer to alerting rules with no alert parameters.
  constructor(private idToName?: Map<string, string>) {
    super('alert');
  }

  class(name: string): Class {
    if (name !== this.name) throw this.badClass(name);
    return new Class(this.name, name);
  }

  // Convert a Query to a relative URI reference.
  linkToQuery(link: URIRef): Query {
    const m = link.pathname.match(/monitoring\/(?:alerts|alertrules)(?:\/(.*))?$/);
    if (!m) throw this.badLink(link);
    const ruleID = m?.[1];
    let selector: { alertname?: string };
    if (ruleID) {
      // Search for alerts belonging to a specific alerting rule.
      selector = Object.fromEntries(link.searchParams);
      // Get the name from the path if not found in search parameters.
      if (!selector.alertname) {
        const name = this?.idToName?.get(ruleID);
        if (name) selector.alertname = name;
      }
      // Must have an alertname for a specific rule search.
      if (!selector.alertname) throw this.badLink(link, 'cannot find alertname');
    } else {
      // Generic alert search across rules. Empty selector is allowed - means "all alerts"
      selector = parseKeyValueList(link.searchParams.get('alerts'));
    }
    return new Query(this.class('alert'), JSON.stringify(selector));
  }

  queryToLink(query: Query): URIRef {
    const selectors = keyValueList(JSON.parse(query.selector));
    return new URIRef(`monitoring/alerts`, { alerts: selectors || undefined });
  }
}
